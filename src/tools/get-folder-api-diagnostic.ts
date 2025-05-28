import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";
import fetch from "node-fetch";

const schema = {
    projectId: z.string().nonempty(),
    accountId: z.string().optional()
};

export const getFolderApiDiagnostic: Tool<typeof schema> = {
    title: "get-folder-api-diagnostic",
    description: "Comprehensive diagnostic tool to debug folder API access issues with multiple approaches",
    schema,
    callback: async ({ projectId, accountId }) => {
        const diagnostics: any = {
            originalProjectId: projectId,
            providedAccountId: accountId,
            timestamp: new Date().toISOString(),
            tests: []
        };
        
        try {
            // Get access token with all necessary scopes
            const accessToken = await getAccessToken(["data:read", "data:write", "data:create", "data:search"]);
            const dataClient = new DataManagementClient();
            
            // Test 1: Get Hub/Account ID if not provided
            if (!accountId) {
                diagnostics.tests.push({
                    name: "Get Account ID from Hubs",
                    description: "Retrieve account ID from available hubs"
                });
                
                try {
                    const hubs = await dataClient.getHubs({ accessToken });
                    const accHub = hubs.data?.find(hub => hub.id?.startsWith("b."));
                    accountId = accHub?.id || hubs.data?.[0]?.id || "";
                    
                    diagnostics.tests[diagnostics.tests.length - 1].result = {
                        success: true,
                        hubCount: hubs.data?.length || 0,
                        accountId: accountId,
                        allHubs: hubs.data?.map(h => ({ id: h.id, name: h.attributes?.name }))
                    };
                } catch (error) {
                    diagnostics.tests[diagnostics.tests.length - 1].result = {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                    throw new Error("Cannot proceed without account ID");
                }
            }
            
            // Test 2: Validate project exists
            diagnostics.tests.push({
                name: "Validate Project Exists",
                description: "Check if project exists in the account"
            });
            
            try {
                const projects = await dataClient.getHubProjects(accountId!, { accessToken });
                const projectExists = projects.data?.some(p => 
                    p.id === projectId || 
                    p.id === `b.${projectId}` || 
                    p.id === projectId.replace("b.", "")
                );
                
                const matchingProject = projects.data?.find(p => 
                    p.id === projectId || 
                    p.id === `b.${projectId}` || 
                    p.id === projectId.replace("b.", "")
                );
                
                diagnostics.tests[diagnostics.tests.length - 1].result = {
                    success: true,
                    projectExists,
                    matchingProject: matchingProject ? {
                        id: matchingProject.id,
                        name: matchingProject.attributes?.name,
                        type: matchingProject.type
                    } : null,
                    totalProjects: projects.data?.length || 0
                };
                
                // Update projectId if we found a match with different format
                if (matchingProject && matchingProject.id !== projectId) {
                    diagnostics.correctedProjectId = matchingProject.id;
                    projectId = matchingProject.id;
                }
            } catch (error) {
                diagnostics.tests[diagnostics.tests.length - 1].result = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            // Test 3: Try different project ID formats with SDK
            const projectIdFormats = [
                { name: "Original", value: projectId },
                { name: "Without b. prefix", value: projectId.replace(/^b\./, "") },
                { name: "With b. prefix", value: projectId.startsWith("b.") ? projectId : `b.${projectId}` }
            ];
            
            for (const format of projectIdFormats) {
                diagnostics.tests.push({
                    name: `SDK Call with ${format.name}`,
                    description: `Test folder access using ${format.name} format: ${format.value}`
                });
                
                try {
                    const topFolders = await dataClient.getProjectTopFolders(
                        accountId!, 
                        format.value, 
                        { accessToken }
                    );
                    
                    diagnostics.tests[diagnostics.tests.length - 1].result = {
                        success: true,
                        folderCount: topFolders.data?.length || 0,
                        folders: topFolders.data?.slice(0, 3).map(f => ({
                            id: f.id,
                            name: f.attributes?.displayName,
                            type: f.type
                        }))
                    };
                    
                    // If successful, note this format works
                    diagnostics.workingFormat = format;
                    break; // Found working format
                } catch (error) {
                    diagnostics.tests[diagnostics.tests.length - 1].result = {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        statusCode: (error as any).statusCode
                    };
                }
            }
            
            // Test 4: Direct API call (bypass SDK)
            diagnostics.tests.push({
                name: "Direct API Call",
                description: "Test folder access using direct API call (bypass SDK)"
            });
            
            const cleanProjectId = projectId.replace(/^b\./, "");
            const apiUrl = `https://developer.api.autodesk.com/data/v1/projects/${cleanProjectId}/folders`;
            
            try {
                const response = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Accept": "application/vnd.api+json"
                    }
                });
                
                const responseText = await response.text();
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch {
                    responseData = responseText;
                }
                
                diagnostics.tests[diagnostics.tests.length - 1].result = {
                    success: response.ok,
                    statusCode: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    response: response.ok ? responseData : responseText
                };
            } catch (error) {
                diagnostics.tests[diagnostics.tests.length - 1].result = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            // Test 5: Check project relationship link
            diagnostics.tests.push({
                name: "Check Project Relationships",
                description: "Verify project has folders relationship link"
            });
            
            try {
                const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${accountId}/projects/${cleanProjectId}`;
                const response = await fetch(projectUrl, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Accept": "application/vnd.api+json"
                    }
                });
                
                const projectData = await response.json() as any;
                
                diagnostics.tests[diagnostics.tests.length - 1].result = {
                    success: response.ok,
                    statusCode: response.status,
                    hasRootFolder: !!projectData?.data?.relationships?.rootFolder,
                    rootFolderId: projectData?.data?.relationships?.rootFolder?.data?.id,
                    relationships: Object.keys(projectData?.data?.relationships || {})
                };
            } catch (error) {
                diagnostics.tests[diagnostics.tests.length - 1].result = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            // Summary and recommendations
            diagnostics.summary = {
                anyTestSucceeded: diagnostics.tests.some((t: any) => t.result?.success),
                recommendations: []
            };
            
            if (!diagnostics.tests.some((t: any) => t.result?.success && t.name.includes("SDK Call"))) {
                diagnostics.summary.recommendations.push(
                    "SDK calls are failing - check if Data Management API is enabled for the project",
                    "Verify the service account has proper permissions in ACC",
                    "Check if the project is properly provisioned for API access in ACC Account Admin"
                );
            }
            
            if (diagnostics.tests.find((t: any) => t.name === "Direct API Call")?.result?.statusCode === 403) {
                diagnostics.summary.recommendations.push(
                    "403 Forbidden - Service account lacks permissions for this project",
                    "Add the service account to the project with appropriate permissions"
                );
            }
            
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(diagnostics, null, 2)
                }]
            };
            
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        ...diagnostics,
                        fatalError: error instanceof Error ? error.message : 'Unknown error'
                    }, null, 2)
                }]
            };
        }
    }
};
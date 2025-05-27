import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty()
};

export const getProjectFilesDiagnostic: Tool<typeof schema> = {
    title: "get-project-files-diagnostic",
    description: "Diagnostic tool to debug folder access issues step by step",
    schema,
    callback: async ({ projectId }) => {
        try {
            const accessToken = await getAccessToken(["data:read"]);
            const dataClient = new DataManagementClient();
            const cleanProjectId = projectId.replace("b.", "");
            
            const diagnostic: any = {
                projectId: cleanProjectId,
                originalProjectId: projectId,
                steps: {}
            };
            
            // Step 1: Get account ID (same as working diagnostic)
            try {
                const hubs = await dataClient.getHubs({ accessToken });
                diagnostic.steps.getAccounts = {
                    success: true,
                    accountId: hubs.data?.[0]?.id,
                    accountCount: hubs.data?.length || 0
                };
            } catch (error) {
                diagnostic.steps.getAccounts = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                return { content: [{ type: "text", text: JSON.stringify(diagnostic, null, 2) }] };
            }
            
            const accountId = diagnostic.steps.getAccounts.accountId;
            
            // Step 2: Test the exact same API call as existing get-folder-contents
            try {
                diagnostic.steps.folderAPICall = {
                    method: "getProjectTopFolders",
                    parameters: {
                        accountId,
                        projectId: cleanProjectId,
                        accessToken: "***hidden***"
                    }
                };
                
                const topFolders = await dataClient.getProjectTopFolders(accountId, cleanProjectId, { accessToken });
                
                diagnostic.steps.folderAPICall.success = true;
                diagnostic.steps.folderAPICall.result = {
                    folderCount: topFolders.data?.length || 0,
                    hasData: !!topFolders.data,
                    folders: topFolders.data?.slice(0, 3).map(folder => ({
                        id: folder.id,
                        name: folder.attributes?.displayName,
                        type: folder.type
                    })) || []
                };
                
            } catch (error) {
                diagnostic.steps.folderAPICall.success = false;
                diagnostic.steps.folderAPICall.error = error instanceof Error ? error.message : 'Unknown error';
                diagnostic.steps.folderAPICall.errorDetails = {
                    name: error instanceof Error ? error.name : 'Unknown',
                    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
                };
            }
            
            // Step 3: Try alternative approaches
            try {
                // Test if we can get project info (this should work based on diagnostics)
                const projects = await dataClient.getHubProjects(accountId, { accessToken });
                const projectInfo = projects.data?.find(p => p.id === projectId);
                
                diagnostic.steps.projectValidation = {
                    success: true,
                    projectFound: !!projectInfo,
                    projectName: projectInfo?.attributes?.name,
                    projectType: projectInfo?.type
                };
                
            } catch (error) {
                diagnostic.steps.projectValidation = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(diagnostic, null, 2)
                }]
            };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [{
                    type: "text",
                    text: `Diagnostic error: ${errorMessage}`
                }]
            };
        }
    }
};
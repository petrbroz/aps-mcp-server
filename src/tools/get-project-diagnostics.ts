import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { IssuesClient } from "@aps_sdk/construction-issues";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty()
};

export const getProjectDiagnostics: Tool<typeof schema> = {
    title: "get-project-diagnostics",
    description: "Diagnostic tool to check project permissions, data availability, and API access",
    schema,
    callback: async ({ projectId }) => {
        try {
            const accessToken = await getAccessToken(["data:read"]);
            const dataClient = new DataManagementClient();
            const issuesClient = new IssuesClient();
            
            const cleanProjectId = projectId.replace("b.", "");
            const diagnostics: any = {
                projectId: cleanProjectId,
                timestamp: new Date().toISOString(),
                tests: {}
            };
            
            // Test 1: Get accounts
            try {
                const hubs = await dataClient.getHubs({ accessToken });
                diagnostics.tests.accounts = {
                    success: true,
                    count: hubs.data?.length || 0,
                    firstAccountId: hubs.data?.[0]?.id || null
                };
            } catch (error) {
                diagnostics.tests.accounts = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            // Test 2: Get projects
            try {
                const projects = await dataClient.getHubProjects(diagnostics.tests.accounts.firstAccountId, { accessToken });
                diagnostics.tests.projects = {
                    success: true,
                    count: projects.data?.length || 0,
                    projectExists: projects.data?.some(p => p.id === projectId) || false
                };
            } catch (error) {
                diagnostics.tests.projects = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            // Test 3: Get issues
            try {
                const issues = await issuesClient.getIssues(cleanProjectId, { accessToken });
                diagnostics.tests.issues = {
                    success: true,
                    count: issues.results?.length || 0,
                    hasIssues: (issues.results?.length || 0) > 0
                };
            } catch (error) {
                diagnostics.tests.issues = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            // Test 4: Get top folders
            try {
                const topFolders = await dataClient.getProjectTopFolders(diagnostics.tests.accounts.firstAccountId, cleanProjectId, { accessToken });
                diagnostics.tests.folders = {
                    success: true,
                    count: topFolders.data?.length || 0,
                    hasFolders: (topFolders.data?.length || 0) > 0
                };
            } catch (error) {
                diagnostics.tests.folders = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
            
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(diagnostics, null, 2)
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
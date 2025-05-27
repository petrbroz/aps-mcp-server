import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { IssuesClient } from "@aps_sdk/construction-issues";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty(),
    accountId: z.string().optional()
};

export const getProjectSummary: Tool<typeof schema> = {
    title: "get-project-summary",
    description: "Get a comprehensive summary of an ACC project including files, issues, and activity metrics",
    schema,
    callback: async ({ projectId, accountId }) => {
        try {
            const accessToken = await getAccessToken(["data:read"]);
            const dataClient = new DataManagementClient();
            const issuesClient = new IssuesClient();
            
            // Remove b. prefix if present
            const cleanProjectId = projectId.replace("b.", "");
            
            // If no accountId provided, get it from the accounts list
            let resolvedAccountId = accountId;
            if (!resolvedAccountId) {
                const hubs = await dataClient.getHubs({ accessToken });
                if (!hubs.data || hubs.data.length === 0) {
                    throw new Error("No accounts found");
                }
                // Use the first available account
                resolvedAccountId = hubs.data[0].id!;
            }
            
            // Get top-level folders structure
            const topFolders = await dataClient.getProjectTopFolders(resolvedAccountId, cleanProjectId, { accessToken });
            
            // Get issues summary
            const issues = await issuesClient.getIssues(cleanProjectId, { accessToken });
            
            // Analyze issues by status
            const issuesByStatus = (issues.results || []).reduce((acc: any, issue: any) => {
                const status = issue.status || 'unknown';
                if (!acc[status]) acc[status] = 0;
                acc[status]++;
                return acc;
            }, {});
            
            // Count files in top folders (sample first 3 to avoid long response times)
            let totalFileCount = 0;
            const folderSummaries = [];
            
            for (const folder of (topFolders.data || []).slice(0, 3)) {
                try {
                    const folderContents = await dataClient.getFolderContents(cleanProjectId, folder.id!, { accessToken });
                    const fileCount = folderContents.data?.length || 0;
                    totalFileCount += fileCount;
                    
                    folderSummaries.push({
                        name: folder.attributes?.displayName,
                        fileCount,
                        lastModified: folder.attributes?.lastModifiedTime
                    });
                } catch (error) {
                    // Skip folders we can't access
                    folderSummaries.push({
                        name: folder.attributes?.displayName,
                        fileCount: 0,
                        error: 'Access denied or empty'
                    });
                }
            }
            
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        project: {
                            accountId: resolvedAccountId,
                            projectId: cleanProjectId
                        },
                        summary: {
                            totalTopLevelFolders: topFolders.data?.length || 0,
                            estimatedFileCount: totalFileCount,
                            totalIssues: issues.results?.length || 0,
                            issuesByStatus
                        },
                        folderSummaries,
                        recentIssues: (issues.results || []).slice(0, 5).map((issue: any) => ({
                            id: issue.id,
                            title: issue.title,
                            status: issue.status,
                            assignedTo: issue.assigned_to,
                            createdAt: issue.created_at,
                            dueDate: issue.due_date
                        }))
                    }, null, 2)
                }]
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [{
                    type: "text",
                    text: `Error generating project summary: ${errorMessage}`
                }]
            };
        }
    }
};
import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty(),
    accountId: z.string().optional(),
    folderId: z.string().optional()
};

export const getProjectFiles: Tool<typeof schema> = {
    title: "get-project-files",
    description: "Enhanced file and folder browser for ACC projects with detailed metadata and version info",
    schema,
    callback: async ({ projectId, accountId, folderId }) => {
        try {
            const accessToken = await getAccessToken(["data:read"]);
            const dataClient = new DataManagementClient();
            
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
            
            if (folderId) {
                // Get specific folder contents
                const folderContents = await dataClient.getFolderContents(cleanProjectId, folderId, { accessToken });
                
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            accountId: resolvedAccountId,
                            projectId: cleanProjectId,
                            folderId,
                            contents: folderContents.data?.map(item => ({
                                id: item.id,
                                type: item.type,
                                name: item.attributes?.displayName,
                                createdTime: item.attributes?.createTime,
                                modifiedTime: item.attributes?.lastModifiedTime,
                                isFolder: item.type === 'folders'
                            })) || []
                        }, null, 2)
                    }]
                };
            } else {
                // Get project top folders
                const topFolders = await dataClient.getProjectTopFolders(resolvedAccountId, cleanProjectId, { accessToken });
                
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            accountId: resolvedAccountId,
                            projectId: cleanProjectId,
                            totalFolders: topFolders.data?.length || 0,
                            topLevelFolders: topFolders.data?.map(folder => ({
                                id: folder.id,
                                name: folder.attributes?.displayName,
                                type: folder.type,
                                createdAt: folder.attributes?.createTime,
                                modifiedAt: folder.attributes?.lastModifiedTime
                            })) || []
                        }, null, 2)
                    }]
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [{
                    type: "text",
                    text: `Error accessing project files: ${errorMessage}`
                }]
            };
        }
    }
};
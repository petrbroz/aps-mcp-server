import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    accountId: z.string().nonempty(),
    projectId: z.string().nonempty(),
    folderId: z.string().optional()
};

export const getFolderContents: Tool<typeof schema> = {
    title: "get-folder-contents",
    description: "List contents of a project or a specific subfolder in Autodesk Construction Cloud",
    schema,
    callback: async ({ accountId, projectId, folderId }) => {
        try {
            const accessToken = await getAccessToken(["data:read", "data:write", "data:create", "data:search"]);
            const dataManagementClient = new DataManagementClient();
            
            // Use the project ID as provided - the SDK handles the proper format
            const contents = folderId
                ? await dataManagementClient.getFolderContents(projectId, folderId, { accessToken })
                : await dataManagementClient.getProjectTopFolders(accountId, projectId, { accessToken });
            
            if (!contents.data) {
                throw new Error("No contents found");
            }
            
            return {
                content: contents.data.map((item) => ({ type: "text", text: JSON.stringify(item) }))
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [{
                    type: "text",
                    text: `Error: ${errorMessage}`
                }]
            };
        }
    }
};
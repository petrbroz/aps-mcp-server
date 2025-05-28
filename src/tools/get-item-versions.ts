import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty(),
    itemId: z.string().nonempty(),
    accountId: z.string().optional()
};

export const getItemVersions: Tool<typeof schema> = {
    title: "get-item-versions",
    description: "List all versions of a document in Autodesk Construction Cloud",
    schema,
    callback: async ({ projectId, itemId, accountId }) => {
        const accessToken = await getAccessToken(["data:read", "data:write", "data:create", "data:search"]);
        const dataManagementClient = new DataManagementClient();
        
        // Get accountId if not provided
        let resolvedAccountId = accountId;
        if (!resolvedAccountId) {
            const hubs = await dataManagementClient.getHubs({ accessToken });
            if (!hubs.data || hubs.data.length === 0) {
                throw new Error("No accounts found");
            }
            resolvedAccountId = hubs.data[0].id!;
        }
        
        // Use the project ID as provided - the SDK handles the proper format
        const versions = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken });
        if (!versions.data) {
            throw new Error("No versions found");
        }
        return {
            content: versions.data.map((version) => ({ type: "text", text: JSON.stringify(version) }))
        };
    }
};
import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty(),
    itemId: z.string().nonempty()
};

export const getItemVersions: Tool<typeof schema> = {
    title: "get-item-versions",
    description: "List all versions of a document in Autodesk Construction Cloud",
    schema,
    callback: async ({ projectId, itemId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken(["data:read"]);
        const dataManagementClient = new DataManagementClient();
        const versions = await dataManagementClient.getItemVersions(projectId, itemId, { accessToken });
        if (!versions.data) {
            throw new Error("No versions found");
        }
        return {
            content: versions.data.map((version) => ({ type: "text", text: JSON.stringify(version) }))
        };
    }
};
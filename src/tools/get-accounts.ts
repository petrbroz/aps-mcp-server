import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {};

export const getAccounts: Tool<typeof schema> = {
    title: "get-accounts",
    description: "List all available Autodesk Construction Cloud accounts",
    schema,
    callback: async () => {
        const accessToken = await getAccessToken(["data:read"]);
        const dataManagementClient = new DataManagementClient();
        const hubs = await dataManagementClient.getHubs({ accessToken });
        if (!hubs.data) {
            throw new Error("No accounts found");
        }
        return {
            content: hubs.data.map((hub) => ({
                type: "text",
                text: JSON.stringify({ id: hub.id, name: hub.attributes?.name })
            }))
        };
    }
};
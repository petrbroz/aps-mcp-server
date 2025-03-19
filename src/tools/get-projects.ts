import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    accountId: z.string().nonempty()
};

export const getProjects: Tool<typeof schema> = {
    title: "get-projects",
    description: "List all available projects in an Autodesk Construction Cloud account",
    schema,
    callback: async ({ accountId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken(["data:read"]);
        const dataManagementClient = new DataManagementClient();
        const projects = await dataManagementClient.getHubProjects(accountId, { accessToken });
        if (!projects.data) {
            throw new Error("No projects found");
        }
        return {
            content: projects.data.map((project) => ({
                type: "text",
                text: JSON.stringify({ id: project.id, name: project.attributes?.name })
            }))
        };
    }
};
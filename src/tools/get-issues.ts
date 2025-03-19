import { z } from "zod";
import { IssuesClient } from "@aps_sdk/construction-issues";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty()
};

export const getIssues: Tool<typeof schema> = {
    title: "get-issues",
    description: "List all available projects in an Autodesk Construction Cloud account",
    schema,
    callback: async ({ projectId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken(["data:read"]);
        const issuesClient = new IssuesClient();
        projectId = projectId.replace("b.", ""); // the projectId should not contain the "b." prefix
        const issues = await issuesClient.getIssues(projectId, { accessToken });
        if (!issues.results) {
            throw new Error("No issues found");
        }
        return {
            content: issues.results.map((issue) => ({ type: "text", text: JSON.stringify(issue) }))
        };
    }
};
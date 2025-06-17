import { z } from "zod";
import { IssuesClient } from "@aps_sdk/construction-issues";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty()
};

export const getIssueTypes: Tool<typeof schema> = {
    title: "get-issue-types",
    description: "List all issue types in an Autodesk Construction Cloud project",
    schema,
    callback: async ({ projectId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken(["data:read"]);
        const issuesClient = new IssuesClient();
        projectId = projectId.replace("b.", ""); // the projectId should not contain the "b." prefix
        const issueTypes = await issuesClient.getIssuesTypes(projectId, { accessToken });
        if (!issueTypes.results) {
            throw new Error("No issue types found");
        }
        return {
            content: issueTypes.results.map((issue) => ({ type: "text", text: JSON.stringify(issue) }))
        };
    }
};
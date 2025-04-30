import { z } from "zod";
import { IssuesClient } from "@aps_sdk/construction-issues";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    projectId: z.string().nonempty()
};

export const getIssueRootCauses: Tool<typeof schema> = {
    title: "get-issue-root-causes",
    description: "Retrieves a list of supported root cause categories and root causes that you can allocate to an issue in Autodesk Construction Cloud.",
    schema,
    callback: async ({ projectId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken(["data:read"]);
        const issuesClient = new IssuesClient();
        projectId = projectId.replace("b.", ""); // the projectId should not contain the "b." prefix
        const rootCauses = await issuesClient.getRootCauseCategories(projectId, { accessToken });
        if (!rootCauses.results) {
            throw new Error("No root causes found");
        }
        return {
            content: rootCauses.results.map((rootCause) => ({ type: "text", text: JSON.stringify(rootCause) }))
        };
    }
};
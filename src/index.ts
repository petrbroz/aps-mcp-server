import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DataManagementClient } from "@aps_sdk/data-management";
import { IssuesClient } from "@aps_sdk/construction-issues";
import { z } from "zod";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY } from "./config.js";
import { getServiceAccountAccessToken } from "./auth.js";

const SCOPES = ["data:read"];

const dataManagementClient = new DataManagementClient();
const issuesClient = new IssuesClient();
const server = new McpServer({ name: "autodesk-platform-services", version: "0.0.1" });

async function getAccessToken(): Promise<string> {
    const credentials = await getServiceAccountAccessToken(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY, SCOPES);
    return credentials.access_token;
}

server.tool(
    "get-accounts",
    "List all available Autodesk Construction Cloud accounts",
    {},
    async () => {
        const accessToken = await getAccessToken();
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
);

server.tool(
    "get-projects",
    "List all available projects in an Autodesk Construction Cloud account",
    {
        accountId: z.string().nonempty()
    },
    async ({ accountId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken();
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
);

server.tool(
    "get-folder-contents",
    "List contents of a project or a specific subfolder in Autodesk Construction Cloud",
    {
        accountId: z.string().nonempty(),
        projectId: z.string().nonempty(),
        folderId: z.string().optional()
    },
    async ({ accountId, projectId, folderId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken();
        const contents = folderId
            ? await dataManagementClient.getFolderContents(projectId, folderId, { accessToken })
            : await dataManagementClient.getProjectTopFolders(accountId, projectId, { accessToken });
        if (!contents.data) {
            throw new Error("No contents found");
        }
        return {
            content: contents.data.map((item) => ({ type: "text", text: JSON.stringify(item) }))
        };
    }
);

server.tool(
    "get-project-issues",
    "List all issues in an Autodesk Construction Cloud project",
    {
        projectId: z.string().nonempty()
    },
    async ({ projectId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken();
        projectId = projectId.replace("b.", ""); // the projectId should not contain the "b." prefix
        const issues = await issuesClient.getIssues(projectId, { accessToken });
        if (!issues.results) {
            throw new Error("No issues found");
        }
        return {
            content: issues.results.map((issue) => ({ type: "text", text: JSON.stringify(issue) }))
        };
    }
);

server.tool(
    "get-project-issue-types",
    "List all issue types in an Autodesk Construction Cloud project",
    {
        projectId: z.string().nonempty()
    },
    async ({ projectId }) => {
        // TODO: add pagination support
        const accessToken = await getAccessToken();
        projectId = projectId.replace("b.", ""); // the projectId should not contain the "b." prefix
        const issueTypes = await issuesClient.getIssuesTypes(projectId, { accessToken });
        if (!issueTypes.results) {
            throw new Error("No issue types found");
        }
        return {
            content: issueTypes.results.map((issueType) => ({ type: "text", text: JSON.stringify(issueType) }))
        };
    }
);

try {
    await server.connect(new StdioServerTransport());
} catch (err) {
    console.error("Server error:", err);
}
import { ZodRawShape } from "zod";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY } from "../config.js";
import { getServiceAccountAccessToken } from "../auth.js";

export interface Tool<Args extends ZodRawShape> {
    title: string;
    description: string;
    schema: Args;
    callback: ToolCallback<Args>;
}

export async function getAccessToken(scopes: string[]): Promise<string> {
    const credentials = await getServiceAccountAccessToken(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY, scopes);
    return credentials.access_token;
}
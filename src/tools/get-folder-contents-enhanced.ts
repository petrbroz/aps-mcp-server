import { z } from "zod";
import { DataManagementClient } from "@aps_sdk/data-management";
import { getAccessToken } from "./common.js";
import type { Tool } from "./common.js";

const schema = {
    accountId: z.string().nonempty(),
    projectId: z.string().nonempty(),
    folderId: z.string().optional()
};

export const getFolderContentsEnhanced: Tool<typeof schema> = {
    title: "get-folder-contents-enhanced",
    description: "Enhanced folder content listing with better error handling and ID format validation",
    schema,
    callback: async ({ accountId, projectId, folderId }) => {
        try {
            const accessToken = await getAccessToken(["data:read"]);
            const dataManagementClient = new DataManagementClient();
            
            // Enhanced project ID handling with multiple format attempts
            const projectIdVariants = {
                original: projectId,
                withoutPrefix: projectId.replace(/^b\./, ""),
                withPrefix: projectId.startsWith("b.") ? projectId : `b.${projectId}`,
                urlEncoded: encodeURIComponent(projectId.replace(/^b\./, ""))
            };
            
            // Log the variants for debugging
            console.log("Project ID variants:", projectIdVariants);
            
            let lastError: any = null;
            let successfulVariant: string | null = null;
            
            // Try different project ID formats
            for (const [variantName, variantId] of Object.entries(projectIdVariants)) {
                try {
                    console.log(`Attempting with ${variantName}: ${variantId}`);
                    
                    const contents = folderId
                        ? await dataManagementClient.getFolderContents(variantId, folderId, { accessToken })
                        : await dataManagementClient.getProjectTopFolders(accountId, variantId, { accessToken });
                    
                    if (contents.data) {
                        successfulVariant = variantName;
                        
                        // Success! Return the results with metadata
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        success: true,
                                        projectIdFormat: variantName,
                                        projectIdUsed: variantId,
                                        folderCount: contents.data.length,
                                        folders: contents.data.map((item) => ({
                                            id: item.id,
                                            type: item.type,
                                            name: item.attributes?.displayName || item.attributes?.name,
                                            createTime: item.attributes?.createTime,
                                            modifyTime: item.attributes?.lastModifiedTime,
                                            extension: item.attributes?.extension?.type
                                        }))
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                } catch (error) {
                    lastError = error;
                    console.log(`Failed with ${variantName}:`, error);
                    // Continue to next variant
                }
            }
            
            // If we get here, all variants failed
            throw new Error(`All project ID formats failed. Last error: ${lastError?.message || 'Unknown error'}`);
            
        } catch (finalError) {
            // Return detailed error information
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: finalError instanceof Error ? finalError.message : 'Unknown error',
                        accountId,
                        projectId,
                        debugging: {
                            originalProjectId: projectId,
                            cleanedProjectId: projectId.replace(/^b\./, ""),
                            suggestion: "Check if the project ID format matches what's returned by get-projects tool"
                        }
                    }, null, 2)
                }]
            };
        }
    }
};
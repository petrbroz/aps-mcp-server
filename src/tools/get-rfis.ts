import { z } from "zod";
import { authenticateWithOAuth } from "../utils/oauth.js";
import type { Tool } from "./common.js";
import fetch from "node-fetch";

/**
 * Type definitions for ACC RFI API responses
 * Based on Autodesk Construction Cloud RFI API v2
 */
interface RFI {
    id: string;
    identifier: string;
    title: string;
    status: string;
    priority?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt?: string;
    createdBy: string;
    assignedTo?: string;
    description?: string;
    location?: string;
    references?: any[];
    costImpact?: {
        amount?: number;
        currency?: string;
        description?: string;
    };
    scheduleImpact?: {
        days?: number;
        description?: string;
    };
    attachments?: any[];
    responseCount?: number;
    customFields?: Record<string, any>;
}

interface RFIResponse {
    id: string;
    body: string;
    createdAt: string;
    updatedAt?: string;
    createdBy: string;
    attachments?: any[];
    status?: string;
}

interface APIResponse<T> {
    results?: T[];
    data?: T[];
    pagination?: {
        limit?: number;
        offset?: number;
        totalResults?: number;
    };
}

const schema = {
    projectId: z.string().min(1, "Project ID is required"),
    rfiId: z.string().optional().describe("Specific RFI ID for detailed information"),
    status: z.enum(["open", "answered", "closed", "void"]).optional().describe("Filter RFIs by status")
};

/**
 * Enhanced RFI Tool for ACC Construction Management
 * Provides comprehensive access to RFI (Request for Information) data
 * Essential for construction project communication and issue resolution
 */
export const getRfis: Tool<typeof schema> = {
    title: "get-rfis",
    description: `Retrieve RFIs (Requests for Information) from an Autodesk Construction Cloud project.
    RFIs are critical for construction project communication, clarifications, and issue resolution.
    Supports listing all RFIs or getting detailed information about specific RFIs including responses.`,
    schema,
    callback: async ({ projectId, rfiId, status }) => {
        try {
            // Use OAuth authentication for RFI access
            // RFI API requires user-based authentication for proper accountability
            const oauthTokens = await authenticateWithOAuth();
            const accessToken = oauthTokens.access_token;
            
            // For ACC projects, containerId equals projectId
            // Clean project ID format if needed (remove 'b.' prefix if present)
            const containerId = projectId.replace(/^b\./, '');
            
            if (rfiId) {
                return await getSpecificRFI(accessToken, containerId, rfiId);
            } else {
                return await getAllRFIs(accessToken, containerId, status);
            }
        } catch (error) {
            return handleRFIError(error, projectId, rfiId);
        }
    }
};

/**
 * Retrieves a specific RFI with detailed information including responses
 */
async function getSpecificRFI(
    accessToken: string, 
    containerId: string, 
    rfiId: string
): Promise<any> {
    // Get RFI details using the correct BIM360 RFI API v2 endpoint
    const rfiResponse = await fetch(
        `https://developer.api.autodesk.com/bim360/rfis/v2/containers/${containerId}/rfis/${rfiId}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!rfiResponse.ok) {
        throw new Error(`Failed to fetch RFI: ${rfiResponse.status} ${rfiResponse.statusText}`);
    }

    const rfiData = await rfiResponse.json() as RFI;
    
    // Get RFI responses/comments
    let responses: RFIResponse[] = [];
    try {
        const responsesResponse = await fetch(
            `https://developer.api.autodesk.com/bim360/rfis/v2/containers/${containerId}/rfis/${rfiId}/responses`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (responsesResponse.ok) {
            const responsesData = await responsesResponse.json() as APIResponse<RFIResponse>;
            responses = responsesData.results || responsesData.data || [];
        }
    } catch (error) {
        // Non-critical error - continue without responses
        console.warn('Failed to fetch RFI responses:', error);
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                rfi: {
                    id: rfiData.id,
                    identifier: rfiData.identifier,
                    title: rfiData.title,
                    status: rfiData.status,
                    priority: rfiData.priority,
                    dueDate: rfiData.dueDate,
                    createdAt: rfiData.createdAt,
                    updatedAt: rfiData.updatedAt,
                    createdBy: rfiData.createdBy,
                    assignedTo: rfiData.assignedTo,
                    description: rfiData.description,
                    // Location and reference information
                    location: rfiData.location,
                    references: rfiData.references || [],
                    // Impact assessments
                    costImpact: rfiData.costImpact,
                    scheduleImpact: rfiData.scheduleImpact,
                    // Custom fields for project-specific data
                    customFields: rfiData.customFields || {},
                    // Attachment information
                    attachmentCount: rfiData.attachments?.length || 0,
                    attachments: rfiData.attachments || []
                },
                responses: responses.map((response: RFIResponse) => ({
                    id: response.id,
                    body: response.body,
                    createdAt: response.createdAt,
                    updatedAt: response.updatedAt,
                    createdBy: response.createdBy,
                    status: response.status,
                    attachmentCount: response.attachments?.length || 0
                })),
                responseCount: responses.length,
                summary: {
                    totalResponses: responses.length,
                    hasAttachments: (rfiData.attachments?.length || 0) > 0,
                    hasCostImpact: !!rfiData.costImpact,
                    hasScheduleImpact: !!rfiData.scheduleImpact
                }
            }, null, 2)
        }]
    };
}

/**
 * Retrieves all RFIs in a project with optional status filtering
 */
async function getAllRFIs(
    accessToken: string, 
    containerId: string, 
    status?: string
): Promise<any> {
    // Build URL with optional status filter
    let url = `https://developer.api.autodesk.com/bim360/rfis/v2/containers/${containerId}/rfis`;
    if (status) {
        url += `?filter[status]=${status}`;
    }

    const rfisResponse = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!rfisResponse.ok) {
        throw new Error(`Failed to fetch RFIs: ${rfisResponse.status} ${rfisResponse.statusText}`);
    }

    const rfisData = await rfisResponse.json() as APIResponse<RFI>;
    const rfis = rfisData.results || rfisData.data || [];

    // Group RFIs by status for better project overview
    const rfisByStatus = rfis.reduce((acc: Record<string, RFI[]>, rfi: RFI) => {
        const rfiStatus = rfi.status || 'unknown';
        if (!acc[rfiStatus]) acc[rfiStatus] = [];
        acc[rfiStatus].push(rfi);
        return acc;
    }, {});

    // Calculate project metrics
    const totalWithCostImpact = rfis.filter(rfi => rfi.costImpact).length;
    const totalWithScheduleImpact = rfis.filter(rfi => rfi.scheduleImpact).length;
    const overdue = rfis.filter(rfi => 
        rfi.dueDate && new Date(rfi.dueDate) < new Date() && 
        !['closed', 'void'].includes(rfi.status)
    ).length;

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                containerId,
                summary: {
                    totalRfis: rfis.length,
                    withCostImpact: totalWithCostImpact,
                    withScheduleImpact: totalWithScheduleImpact,
                    overdue: overdue,
                    lastUpdated: new Date().toISOString()
                },
                statusBreakdown: Object.keys(rfisByStatus).map(status => ({
                    status,
                    count: rfisByStatus[status].length,
                    percentage: Math.round((rfisByStatus[status].length / rfis.length) * 100)
                })),
                rfis: rfis.map((rfi: RFI) => ({
                    id: rfi.id,
                    identifier: rfi.identifier,
                    title: rfi.title,
                    status: rfi.status,
                    priority: rfi.priority,
                    dueDate: rfi.dueDate,
                    createdAt: rfi.createdAt,
                    updatedAt: rfi.updatedAt,
                    createdBy: rfi.createdBy,
                    assignedTo: rfi.assignedTo,
                    location: rfi.location,
                    // Impact indicators
                    hasCostImpact: !!rfi.costImpact,
                    hasScheduleImpact: !!rfi.scheduleImpact,
                    costImpact: rfi.costImpact,
                    scheduleImpact: rfi.scheduleImpact,
                    // Engagement metrics
                    responseCount: rfi.responseCount || 0,
                    attachmentCount: rfi.attachments?.length || 0,
                    // Status indicators
                    isOverdue: rfi.dueDate ? 
                        new Date(rfi.dueDate) < new Date() && !['closed', 'void'].includes(rfi.status) : 
                        false
                }))
            }, null, 2)
        }]
    };
}

/**
 * Enhanced error handling for RFI operations with construction management context
 */
function handleRFIError(error: any, projectId: string, rfiId?: string): any {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorType = 'Unknown';
    let tips: string[] = [];
    let severity = 'medium';
    
    if (errorMessage.includes('401')) {
        errorType = 'Authentication Error';
        severity = 'high';
        tips = [
            'OAuth authentication required for RFI access',
            'RFI API requires user-based authentication for accountability',
            'Browser authentication window should have opened automatically'
        ];
    } else if (errorMessage.includes('403')) {
        errorType = 'Authorization Error';
        severity = 'high';
        tips = [
            'User may lack RFI permissions in this project',
            'Contact project administrator for RFI access rights',
            'Verify user is assigned to project with appropriate role'
        ];
    } else if (errorMessage.includes('404')) {
        errorType = 'Not Found';
        severity = 'low';
        tips = rfiId ? 
            [`RFI ${rfiId} not found in project`, 'Verify RFI ID is correct'] :
            ['No RFIs found in project', 'Project may not have any RFIs yet'];
    } else if (errorMessage.includes('timeout')) {
        errorType = 'Network Timeout';
        severity = 'medium';
        tips = [
            'Request timed out - try again',
            'Large projects may take longer to load',
            'Consider filtering by status to reduce response size'
        ];
    }
    
    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                error: {
                    type: errorType,
                    severity: severity,
                    message: errorMessage,
                    projectId,
                    rfiId,
                    timestamp: new Date().toISOString(),
                    troubleshooting: tips,
                    constructionContext: {
                        note: 'RFIs are critical for construction communication',
                        impact: 'RFI delays can affect project schedule and budget',
                        recommendation: 'Ensure proper user permissions for RFI management'
                    }
                }
            }, null, 2)
        }]
    };
}

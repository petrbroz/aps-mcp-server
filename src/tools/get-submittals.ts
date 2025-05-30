import { z } from "zod";
import { authenticateWithOAuth } from "../utils/oauth.js";
import type { Tool } from "./common.js";
import fetch from "node-fetch";

/**
 * Type definitions for ACC Submittals API responses
 * Based on Autodesk Construction Cloud Submittals API
 */
interface Submittal {
    id: string;
    identifier: string;
    customIdentifier?: string;
    customIdentifierHumanReadable?: string;
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
    type?: string;
    specSection?: string;
    submissionType?: string;
    reviewStatus?: string;
    attachments?: any[];
    responses?: any[];
    customFields?: Record<string, any>;
}

interface SubmittalResponse {
    id: string;
    body: string;
    createdAt: string;
    updatedAt?: string;
    createdBy: string;
    attachments?: any[];
    status?: string;
    reviewStatus?: string;
}

interface SubmittalItemType {
    id: string;
    name: string;
    description?: string;
    category?: string;
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
    submittalId: z.string().optional().describe("Specific submittal ID for detailed information"),
    status: z.enum(["draft", "submitted", "reviewed", "approved", "rejected", "closed"]).optional().describe("Filter submittals by status"),
    includeResponses: z.boolean().optional().default(false).describe("Include submittal responses and review comments")
};

/**
 * Enhanced Submittals Tool for ACC Construction Management
 * Provides comprehensive access to submittal data for construction projects
 * Essential for material approval workflows and project specification compliance
 */
export const getSubmittals: Tool<typeof schema> = {
    title: "get-submittals",
    description: `Retrieve submittals from an Autodesk Construction Cloud project.
    Submittals are formal documents submitted for approval of materials, equipment, and methods.
    Critical for ensuring project specifications are met and maintaining quality control.
    Supports listing all submittals or getting detailed information about specific submittals.`,
    schema,
    callback: async ({ projectId, submittalId, status, includeResponses = false }) => {
        try {
            // Use OAuth authentication for submittal access
            // Submittals API requires user-based authentication for proper accountability
            const oauthTokens = await authenticateWithOAuth();
            const accessToken = oauthTokens.access_token;
            
            // Keep original project ID format to match working Forms API
            const cleanProjectId = projectId;
            
            if (submittalId) {
                return await getSpecificSubmittal(accessToken, cleanProjectId, submittalId, includeResponses);
            } else {
                return await getAllSubmittals(accessToken, cleanProjectId, status, includeResponses);
            }
        } catch (error) {
            return handleSubmittalError(error, projectId, submittalId);
        }
    }
};

/**
 * Retrieves a specific submittal with detailed information
 */
async function getSpecificSubmittal(
    accessToken: string, 
    projectId: string, 
    submittalId: string,
    includeResponses: boolean
): Promise<any> {
    // Try multiple potential endpoint formats for submittals API
    const potentialEndpoints = [
        `https://developer.api.autodesk.com/construction/submittals/v1/projects/${projectId}/submittals/${submittalId}`,
        `https://developer.api.autodesk.com/construction/submittals/v1/projects/${projectId}/items/${submittalId}`,
        `https://developer.api.autodesk.com/construction/submittals/v1/containers/${projectId}/items/${submittalId}`,
        `https://developer.api.autodesk.com/bim360/submittals/v1/containers/${projectId}/items/${submittalId}`,
        `https://developer.api.autodesk.com/acc/submittals/v1/projects/${projectId}/items/${submittalId}`,
        `https://developer.api.autodesk.com/acc/submittals/v1/containers/${projectId}/items/${submittalId}`
    ];

    let submittalData: Submittal | null = null;
    let workingEndpoint = '';
    let errorDetails: string[] = [];

    // Try each endpoint until one works
    for (const endpoint of potentialEndpoints) {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Log the attempt for debugging
            errorDetails.push(`${endpoint}: ${response.status} ${response.statusText}`);

            if (response.ok) {
                submittalData = await response.json() as Submittal;
                workingEndpoint = endpoint;
                break;
            }
        } catch (error) {
            // Log the error for debugging
            errorDetails.push(`${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Continue to next endpoint
            continue;
        }
    }

    if (!submittalData) {
        throw new Error(`Failed to fetch submittal from any available endpoint. Attempts: ${errorDetails.join('; ')}`);
    }
    
    // Get submittal responses if requested
    let responses: SubmittalResponse[] = [];
    if (includeResponses) {
        try {
            const responsesEndpoint = workingEndpoint.replace('/items/', '/items/') + '/responses';
            const responsesResponse = await fetch(responsesEndpoint, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (responsesResponse.ok) {
                const responsesData = await responsesResponse.json() as APIResponse<SubmittalResponse>;
                responses = responsesData.results || responsesData.data || [];
            }
        } catch (error) {
            // Non-critical error - continue without responses
            console.warn('Failed to fetch submittal responses:', error);
        }
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                submittal: {
                    id: submittalData.id,
                    identifier: submittalData.identifier,
                    customIdentifier: submittalData.customIdentifier,
                    customIdentifierHumanReadable: submittalData.customIdentifierHumanReadable,
                    title: submittalData.title,
                    status: submittalData.status,
                    priority: submittalData.priority,
                    dueDate: submittalData.dueDate,
                    createdAt: submittalData.createdAt,
                    updatedAt: submittalData.updatedAt,
                    createdBy: submittalData.createdBy,
                    assignedTo: submittalData.assignedTo,
                    description: submittalData.description,
                    // Submittal-specific fields
                    location: submittalData.location,
                    type: submittalData.type,
                    specSection: submittalData.specSection,
                    submissionType: submittalData.submissionType,
                    reviewStatus: submittalData.reviewStatus,
                    // Custom fields for project-specific data
                    customFields: submittalData.customFields || {},
                    // Attachment information
                    attachmentCount: submittalData.attachments?.length || 0,
                    attachments: submittalData.attachments || []
                },
                responses: includeResponses ? responses.map((response: SubmittalResponse) => ({
                    id: response.id,
                    body: response.body,
                    createdAt: response.createdAt,
                    updatedAt: response.updatedAt,
                    createdBy: response.createdBy,
                    status: response.status,
                    reviewStatus: response.reviewStatus,
                    attachmentCount: response.attachments?.length || 0
                })) : undefined,
                responseCount: responses.length,
                summary: {
                    totalResponses: responses.length,
                    hasAttachments: (submittalData.attachments?.length || 0) > 0,
                    hasCustomIdentifier: !!submittalData.customIdentifier,
                    reviewStatus: submittalData.reviewStatus
                },
                _metadata: {
                    endpointUsed: workingEndpoint,
                    apiVersion: 'v1'
                }
            }, null, 2)
        }]
    };
}

/**
 * Retrieves all submittals in a project with optional status filtering
 */
async function getAllSubmittals(
    accessToken: string, 
    projectId: string, 
    status?: string,
    includeResponses?: boolean
): Promise<any> {
    // Try multiple potential endpoint formats for submittals API
    const potentialEndpoints = [
        `https://developer.api.autodesk.com/construction/submittals/v1/projects/${projectId}/submittals`,
        `https://developer.api.autodesk.com/construction/submittals/v1/projects/${projectId}/items`,
        `https://developer.api.autodesk.com/construction/submittals/v1/containers/${projectId}/items`,
        `https://developer.api.autodesk.com/bim360/submittals/v1/containers/${projectId}/items`,
        `https://developer.api.autodesk.com/acc/submittals/v1/projects/${projectId}/items`,  
        `https://developer.api.autodesk.com/acc/submittals/v1/containers/${projectId}/items`
    ];

    let submittalsData: Submittal[] = [];
    let workingEndpoint = '';
    let errorDetails: string[] = [];

    // Try each endpoint until one works
    for (let endpoint of potentialEndpoints) {
        // Add status filter if provided
        if (status) {
            endpoint += `?filter[status]=${status}`;
        }

        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Log the attempt for debugging
            errorDetails.push(`${endpoint}: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const responseData = await response.json() as APIResponse<Submittal>;
                submittalsData = responseData.results || responseData.data || [];
                workingEndpoint = endpoint;
                break;
            }
        } catch (error) {
            // Log the error for debugging  
            errorDetails.push(`${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Continue to next endpoint
            continue;
        }
    }

    if (!workingEndpoint) {
        throw new Error(`Failed to fetch submittals from any available endpoint. Attempts: ${errorDetails.join('; ')}`);
    }

    // Group submittals by status for better project overview
    const submittalsByStatus = submittalsData.reduce((acc: Record<string, Submittal[]>, submittal: Submittal) => {
        const submittalStatus = submittal.status || 'unknown';
        if (!acc[submittalStatus]) acc[submittalStatus] = [];
        acc[submittalStatus].push(submittal);
        return acc;
    }, {});

    // Calculate project metrics
    const totalWithCustomIds = submittalsData.filter(s => s.customIdentifier).length;
    const totalPending = submittalsData.filter(s => ['draft', 'submitted'].includes(s.status)).length;
    const totalApproved = submittalsData.filter(s => s.status === 'approved').length;
    const overdue = submittalsData.filter(s => 
        s.dueDate && new Date(s.dueDate) < new Date() && 
        !['approved', 'closed'].includes(s.status)
    ).length;

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                projectId,
                summary: {
                    totalSubmittals: submittalsData.length,
                    withCustomIdentifiers: totalWithCustomIds,
                    pending: totalPending,
                    approved: totalApproved,
                    overdue: overdue,
                    lastUpdated: new Date().toISOString()
                },
                statusBreakdown: Object.keys(submittalsByStatus).map(status => ({
                    status,
                    count: submittalsByStatus[status].length,
                    percentage: submittalsData.length > 0 ? 
                        Math.round((submittalsByStatus[status].length / submittalsData.length) * 100) : 0
                })),
                submittals: submittalsData.map((submittal: Submittal) => ({
                    id: submittal.id,
                    identifier: submittal.identifier,
                    customIdentifier: submittal.customIdentifier,
                    customIdentifierHumanReadable: submittal.customIdentifierHumanReadable,
                    title: submittal.title,
                    status: submittal.status,
                    priority: submittal.priority,
                    dueDate: submittal.dueDate,
                    createdAt: submittal.createdAt,
                    updatedAt: submittal.updatedAt,
                    createdBy: submittal.createdBy,
                    assignedTo: submittal.assignedTo,
                    // Submittal-specific information
                    type: submittal.type,
                    specSection: submittal.specSection,
                    submissionType: submittal.submissionType,
                    reviewStatus: submittal.reviewStatus,
                    location: submittal.location,
                    // Engagement metrics
                    attachmentCount: submittal.attachments?.length || 0,
                    // Status indicators
                    isOverdue: submittal.dueDate ? 
                        new Date(submittal.dueDate) < new Date() && !['approved', 'closed'].includes(submittal.status) : 
                        false,
                    hasCustomId: !!submittal.customIdentifier
                })),
                _metadata: {
                    endpointUsed: workingEndpoint,
                    apiVersion: 'v1',
                    note: 'Submittals API endpoint automatically detected'
                }
            }, null, 2)
        }]
    };
}

/**
 * Enhanced error handling for submittal operations with construction management context
 */
function handleSubmittalError(error: any, projectId: string, submittalId?: string): any {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorType = 'Unknown';
    let tips: string[] = [];
    let severity = 'medium';
    
    if (errorMessage.includes('401')) {
        errorType = 'Authentication Error';
        severity = 'high';
        tips = [
            'OAuth authentication required for submittal access',
            'Submittals API requires user-based authentication',
            'Browser authentication window should have opened automatically'
        ];
    } else if (errorMessage.includes('403')) {
        errorType = 'Authorization Error';
        severity = 'high';
        tips = [
            'User may lack submittal permissions in this project',
            'Contact project administrator for submittal access rights',
            'Verify user is assigned to project with appropriate role'
        ];
    } else if (errorMessage.includes('404') || errorMessage.includes('any available endpoint')) {
        errorType = 'API Endpoint Not Found';
        severity = 'high';
        tips = submittalId ? 
            [`Submittal ${submittalId} not found`, 'Verify submittal ID is correct', 'Submittals API may not be available for this project'] :
            ['No submittals found or API not available', 'Project may not have submittals enabled', 'Submittals API may not be available in this region'];
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
                    submittalId,
                    timestamp: new Date().toISOString(),
                    troubleshooting: tips,
                    constructionContext: {
                        note: 'Submittals are critical for material approval workflows',
                        impact: 'Submittal delays can affect procurement and construction schedule',
                        recommendation: 'Ensure submittals module is enabled and user has proper permissions',
                        apiStatus: 'Submittals API is relatively new - endpoint format may vary by region/project type'
                    }
                }
            }, null, 2)
        }]
    };
}

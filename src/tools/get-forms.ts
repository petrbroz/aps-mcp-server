import { z } from "zod";
import { authenticateWithOAuth } from "../utils/oauth.js";
import type { Tool } from "./common.js";
import fetch from "node-fetch";

// Core type definitions for Forms API
interface Form {
    id: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    submissionCount?: number;
    template?: {
        name?: string;
        type?: string;
    };
}

interface FormSubmission {
    id: string;
    status: string;
    submittedBy: string;
    submittedAt: string;
    location?: string;
}

interface APIResponse<T> {
    results?: T[];
    pagination?: {
        totalResults?: number;
    };
}

const schema = {
    projectId: z.string().min(1, "Project ID is required"),
    formId: z.string().optional().describe("Specific form ID for detailed info"),
    includeSubmissions: z.boolean().optional().default(false).describe("Include submission data")
};

/**
 * Enhanced Forms Tool for ACC Construction Management
 * This tool provides access to forms data which is critical for construction
 * project oversight, including inspections, safety reports, and quality control
 */
export const getForms: Tool<typeof schema> = {
    title: "get-forms", 
    description: `Retrieve forms data from an Autodesk Construction Cloud project. 
    Forms are essential for construction management workflows including inspections, 
    safety reports, quality control, and compliance documentation.`,
    schema,
    callback: async ({ projectId, formId, includeSubmissions = false }) => {
        try {
            // Use OAuth authentication for forms access
            // This provides the user-based authentication that Autodesk requires for forms
            const oauthTokens = await authenticateWithOAuth();
            const accessToken = oauthTokens.access_token;
            
            if (formId) {
                return await getSpecificForm(accessToken, projectId, formId, includeSubmissions);
            } else {
                return await getAllForms(accessToken, projectId, includeSubmissions);
            }
        } catch (error) {
            return handleFormsError(error, projectId, formId);
        }
    }
};

/**
 * Retrieves a specific form with detailed information
 */
async function getSpecificForm(
    accessToken: string, 
    projectId: string, 
    formId: string, 
    includeSubmissions: boolean
): Promise<any> {
    const formResponse = await fetch(
        `https://developer.api.autodesk.com/construction/forms/v2/projects/${projectId}/forms/${formId}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!formResponse.ok) {
        throw new Error(`Failed to fetch form: ${formResponse.status} ${formResponse.statusText}`);
    }

    const formData = await formResponse.json() as Form;
    let submissions: FormSubmission[] = [];

    if (includeSubmissions) {
        submissions = await getFormSubmissions(accessToken, projectId, formId);
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                form: {
                    id: formData.id,
                    name: formData.name,
                    type: formData.type,
                    status: formData.status,
                    createdAt: formData.createdAt,
                    updatedAt: formData.updatedAt,
                    submissionCount: formData.submissionCount || 0,
                    template: formData.template
                },
                submissions: includeSubmissions ? submissions : undefined
            }, null, 2)
        }]
    };
}

/**
 * Retrieves all forms in a project
 */
async function getAllForms(
    accessToken: string, 
    projectId: string, 
    includeSubmissions: boolean
): Promise<any> {
    const formsResponse = await fetch(
        `https://developer.api.autodesk.com/construction/forms/v2/projects/${projectId}/forms`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!formsResponse.ok) {
        throw new Error(`Failed to fetch forms: ${formsResponse.status} ${formsResponse.statusText}`);
    }

    const formsData = await formsResponse.json() as APIResponse<Form>;
    const forms = formsData.results || [];

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                projectId,
                totalForms: forms.length,
                forms: forms.map(form => ({
                    id: form.id,
                    name: form.name,
                    type: form.type,
                    status: form.status,
                    createdAt: form.createdAt,
                    updatedAt: form.updatedAt,
                    submissionCount: form.submissionCount || 0,
                    template: form.template
                }))
            }, null, 2)
        }]
    };
}

/**
 * Helper function to get form submissions
 */
async function getFormSubmissions(
    accessToken: string, 
    projectId: string, 
    formId: string
): Promise<FormSubmission[]> {
    const submissionsResponse = await fetch(
        `https://developer.api.autodesk.com/construction/forms/v2/projects/${projectId}/forms/${formId}/submissions`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json() as APIResponse<FormSubmission>;
        return submissionsData.results || [];
    }
    return [];
}

/**
 * Enhanced error handling for forms operations
 */
function handleFormsError(error: any, projectId: string, formId?: string): any {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorType = 'Unknown';
    let tips: string[] = [];
    
    if (errorMessage.includes('401')) {
        errorType = 'Authentication Error';
        tips = ['Verify service account permissions for forms access'];
    } else if (errorMessage.includes('403')) {
        errorType = 'Authorization Error';
        tips = ['Service account may lack forms permissions', 'Contact ACC admin for forms access'];
    } else if (errorMessage.includes('404')) {
        errorType = 'Not Found';
        tips = [formId ? `Form ${formId} not found` : 'No forms found in project'];
    }
    
    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                error: {
                    type: errorType,
                    message: errorMessage,
                    projectId,
                    formId,
                    troubleshooting: tips
                }
            }, null, 2)
        }]
    };
}

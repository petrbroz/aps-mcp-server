// Export existing working tools
export { getAccounts } from "./get-accounts.js";
export { getProjects } from "./get-projects.js";
export { getFolderContents } from "./get-folder-contents.js";
export { getItemVersions } from "./get-item-versions.js";
export { getIssues } from "./get-issues.js";
export { getIssueTypes } from "./get-issue-types.js";
export { getIssueRootCauses } from "./get-issue-root-causes.js";
export { getIssueComments } from "./get-issue-comments.js";

// Export enhanced ACC tools that work with Service Accounts
export { getProjectFiles } from "./get-project-files.js";
export { getProjectSummary } from "./get-project-summary.js";
export { getProjectDiagnostics } from "./get-project-diagnostics.js";
export { getProjectFilesDiagnostic } from "./get-project-files-diagnostic.js";
export { getFolderContentsEnhanced } from "./get-folder-contents-enhanced.js";
export { getFolderApiDiagnostic } from "./get-folder-api-diagnostic.js";

// Export OAuth-enabled tools for user-accountable construction management workflows
export { getForms } from "./get-forms.js";
export { getRfis } from "./get-rfis.js";
export { getSubmittals } from "./get-submittals.js";

/**
 * Tool Authentication Summary:
 * 
 * SERVICE ACCOUNT TOOLS (Automated):
 * - Projects, files, issues, diagnostics
 * - Use getAccessToken() from common.js
 * - Good for automated workflows and reporting
 * 
 * OAUTH TOOLS (User Accountability):
 * - Forms, RFIs, submittals
 * - Use authenticateWithOAuth() from oauth.js
 * - Required for sensitive construction operations
 * - Provides proper audit trails and user accountability
 */

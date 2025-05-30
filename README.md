# ACC MCP Server

**Status: ✅ FULLY OPERATIONAL** - Complete dual authentication system with OAuth support

Model Context Protocol server for comprehensive [Autodesk Construction Cloud](https://construction.autodesk.com/) integration, built with Node.js and designed specifically for construction management workflows.

## 🚀 **Current Status** 

- ✅ **17 Working Tools** - All functionality operational including forms, RFIs, and submittals
- ✅ **Dual Authentication System** - Both service account and OAuth authentication working
- ✅ **OAuth Token Persistence** - Smart token caching with automatic refresh (no repeated logins)
- ✅ **Service Account Tools** - Projects, files, issues, diagnostics (automated access)
- ✅ **OAuth Tools** - Forms, RFIs, and submittals with intelligent token management (user-accountable access)
- ✅ **Enterprise Ready** - Production-grade credential separation and security practices

> **See [TOOL_STATUS.md](TOOL_STATUS.md) for detailed testing results and technical documentation**

![Screenshot](screenshot.png)

[YouTube Video](https://youtu.be/6DRSR9HlIds)

## 🔐 **Authentication Architecture**

This MCP server implements a sophisticated dual authentication system designed for construction management workflows:

### **Service Account Authentication** (Automated Access)
- **Purpose**: Long-running, automated access to project data
- **Use Cases**: File management, issue tracking, project diagnostics, reporting
- **Benefits**: No user interaction required, works 24/7 for automated workflows
- **Tools**: Projects, files, issues, diagnostics, and most general ACC functionality

### **OAuth Authentication** (User-Accountable Access) 
- **Purpose**: User-based access for operations requiring individual accountability
- **Use Cases**: Forms access, RFI management, submittal approvals, safety inspections, quality control, compliance documentation
- **Benefits**: Proper audit trails, individual accountability, regulatory compliance
- **Token Management**: Intelligent caching with automatic refresh (authenticate once per session)
- **Tools**: Forms, RFIs, submittals, safety reports, and other sensitive construction management operations

This architecture mirrors real construction site security - automated systems for general building access, individual badges for sensitive areas.

## Development

### Prerequisites

- [Node.js](https://nodejs.org) (v16 or higher)
- **Two separate APS applications** (see setup instructions below):
  1. Server-to-Server application for service account authentication
  2. Web Application for OAuth authentication
- [Provisioned access to ACC or BIM360](https://get-started.aps.autodesk.com/#provision-access-in-other-products)

### Setup Instructions

#### Step 1: Clone and Install Dependencies

```bash
git clone <repository-url>
cd acc-mcp-server
yarn install
yarn run build
```

#### Step 2: Create APS Applications

You need to create **two separate applications** in the [Autodesk Platform Services console](https://aps.autodesk.com/myapps/):

##### 2a. Service Account Application
1. Create a new app with type **"Server-to-Server"**
2. Note the Client ID and Client Secret
3. This app handles automated access to most ACC functionality

##### 2b. OAuth Application  
1. Create a new app with type **"Web Application"**
2. Add this **exact callback URL**: `http://localhost:8765/oauth/callback`
3. Note the Client ID and Client Secret
4. This app handles user authentication for forms and sensitive operations

> ⚠️ **Critical**: The OAuth app must be configured as a "Web Application" type to access callback URL settings. "Server-to-Server" apps cannot handle OAuth redirects.

#### Step 3: Configure Environment Variables

1. Copy `env.example` to `.env`
2. Fill in the credentials from both APS applications:

```bash
# Service Account App Credentials (Server-to-Server type)
APS_CLIENT_ID=your_service_account_app_client_id
APS_CLIENT_SECRET=your_service_account_app_client_secret

# OAuth App Credentials (Web Application type) 
APS_OAUTH_CLIENT_ID=your_oauth_app_client_id
APS_OAUTH_CLIENT_SECRET=your_oauth_app_client_secret
```

#### Step 4: Create Service Account

Create a service account for automated access:

```bash
npx create-service-account ssa-construction-manager "Your Name" "Construction Manager"
```

Add the output environment variables to your `.env` file:

```bash
APS_SA_ID=your_service_account_id
APS_SA_EMAIL=your_service_account_email@...
APS_SA_KEY_ID=your_service_account_key_id
APS_SA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
```

#### Step 5: Project Access

Invite your service account email (from Step 4) as a project member in your ACC projects. This enables automated access to project data.

### Use with Inspector

```bash
yarn run inspect
```
Open http://localhost:5173 and hit `Connect`

### Use with Claude Desktop

1. Install [Claude Desktop](https://claude.ai/download)
2. Create/edit the Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. Add this configuration (use your absolute path):

```json
{
    "mcpServers": {
        "acc-construction-cloud": {
            "command": "node",
            "args": [
                "/absolute/path/to/acc-mcp-server/build/server.js"
            ]
        }
    }
}
```

4. Restart Claude Desktop

### Testing Your Setup

Try these prompts to verify functionality:

**Service Account Tools** (work automatically):
- "What ACC projects do I have access to?"
- "Show me the files in project XYZ"
- "Give me a dashboard of all issues in my project"

**OAuth Tools** (will open browser for authentication):
- "Show me the forms in my test project"
- "List all safety inspection forms"
- "Get all RFIs in project XYZ"
- "Show me overdue RFIs with cost impact"
- "List submittals pending approval"
- "Get submittal details for material approvals"

## 🔧 **Troubleshooting**

### OAuth Authentication Issues

**Problem**: "Failed to fetch forms: 404 Not Found"
- **Solution**: Verify your OAuth app is configured as "Web Application" type
- **Check**: Callback URL must be exactly `http://localhost:8765/oauth/callback`

**Problem**: "ReferenceError: require is not defined"
- **Solution**: Run `yarn run build` after any code changes
- **Restart**: Claude Desktop after rebuilding

**Problem**: Browser doesn't open automatically
- **Solution**: Copy the URL from the error message and open manually
- **Note**: This is normal behavior on some systems

### Service Account Issues

**Problem**: "Service account not found" 
- **Solution**: Ensure service account email is invited to your ACC project
- **Check**: Service account must be a project member, not just viewer

**Problem**: "Authentication failed"
- **Solution**: Verify all environment variables are correctly set
- **Check**: No extra spaces or quotes in `.env` file values

### General Issues

**Problem**: "Method not found" errors
- **Solution**: Restart Claude Desktop to reload the MCP server
- **Note**: Required after any code changes or rebuilds

For more detailed troubleshooting, see [Model Context Protocol debugging documentation](https://modelcontextprotocol.io/docs/tools/debugging).

## 📋 **Available Tools**

### Service Account Tools (Automated)
- `get-accounts` - List available ACC accounts
- `get-projects` - List projects in an account
- `get-project-files` - Browse project documents
- `get-project-summary` - Comprehensive project overview
- `get-issues` - List and analyze project issues
- `get-issue-types` - Available issue categories
- `get-issue-comments` - Issue discussion threads
- `get-project-diagnostics` - Project health analysis

### OAuth Tools (User Authentication Required)
- `get-forms` - Access construction forms and submissions
- `get-rfis` - Manage RFIs (Requests for Information) with responses and tracking
- `get-submittals` - Access submittal data for material and equipment approvals
- Additional OAuth tools can be added for other sensitive operations

## 🚧 **Development Notes**

### Adding New OAuth Tools
When adding tools that require user authentication, follow the established pattern:
1. Import `authenticateWithOAuth` from `../utils/oauth.js`
2. Use OAuth tokens instead of service account tokens
3. Handle authentication errors gracefully
4. Provide clear user feedback during authentication flows

### Architecture Principles
- **Separation of Concerns**: Different authentication methods for different use cases
- **Security First**: Proper credential isolation and secure token handling  
- **User Experience**: Minimal friction while maintaining security requirements
- **Enterprise Ready**: Scalable architecture supporting multiple authentication patterns

## 🏗️ **Construction Management Features**

### Project Management
- Multi-project access and switching
- Project diagnostics and health monitoring
- Comprehensive project summaries with metrics

### Document Management  
- File and folder browsing with metadata
- Version history and document tracking
- Advanced search and filtering capabilities

### Issue Tracking
- Complete issue lifecycle management
- Root cause analysis and categorization
- Comment threads and collaboration tools

### Forms & Compliance
- Safety inspection forms and submissions
- Quality control documentation
- Regulatory compliance tracking
- Individual accountability and audit trails

### RFI Management
- Complete RFI lifecycle tracking and management
- Response tracking and collaboration tools
- Cost and schedule impact assessment
- Status monitoring and overdue tracking

### Submittal Management
- Material and equipment approval workflows
- Specification compliance verification
- Custom identifier support for project numbering
- Review status tracking and approval processes

> For more details on MCP server integration, see the [official documentation](https://modelcontextprotocol.io/quickstart/user).

# RFI and Submittal Tools Testing Guide

*Testing Guide for New OAuth-Enabled Construction Management Tools*
*Generated: May 28, 2025*

## 🎯 **Overview**

This guide provides comprehensive testing procedures for the newly implemented RFI and Submittal tools in the ACC MCP Server. These tools require OAuth authentication and provide essential construction management capabilities.

## 🔐 **Authentication Requirements**

Both tools require **3-legged OAuth authentication**:
- ✅ Browser window will open automatically for authentication
- ✅ Tokens are cached for the session (no repeated logins)
- ✅ Uses existing OAuth configuration from `OAUTH_CONFIG`
- ✅ Requires user to be assigned to project with appropriate permissions

## 🛠️ **Tool Testing Procedures**

### **RFI Tool Testing (`get-rfis`)**

#### Basic RFI Listing
```bash
# Test basic RFI retrieval
"List all RFIs in project b.871ee5fd-e16f-47d9-8b73-9613637d1dac"
```

#### Filtered RFI Queries
```bash
# Test status filtering
"Show me open RFIs in the test project"
"Get closed RFIs with their resolution details"
"List overdue RFIs in project XYZ"
```

#### Specific RFI Details
```bash
# Test detailed RFI information (requires actual RFI ID)
"Get details for RFI with ID [actual-rfi-id]"
"Show me responses for RFI [rfi-identifier]"
```

#### Expected Test Outcomes:
- ✅ **No RFIs**: Returns empty list with proper project summary
- ✅ **With RFIs**: Returns structured data with status breakdown
- ✅ **Cost/Schedule Impact**: Shows impact assessments if available
- ✅ **Response Tracking**: Includes response counts and details

---

### **Submittal Tool Testing (`get-submittals`)**

#### Basic Submittal Listing
```bash
# Test basic submittal retrieval
"List all submittals in project b.871ee5fd-e16f-47d9-8b73-9613637d1dac"
```

#### Filtered Submittal Queries
```bash
# Test status filtering
"Show me pending submittals awaiting approval"
"Get approved submittals for material procurement"
"List rejected submittals that need revision"
```

#### Submittal Details with Responses
```bash
# Test detailed submittal information
"Get submittal details including review responses"
"Show me submittal [submittal-id] with all attachments"
```

#### Expected Test Outcomes:
- ✅ **No Submittals**: Returns empty list with API endpoint detection
- ✅ **With Submittals**: Returns structured data with approval workflow
- ✅ **Custom Identifiers**: Shows project-specific numbering systems
- ✅ **Review Status**: Tracks approval/rejection workflow

---

## 🧪 **API Endpoint Discovery**

### **RFI API Endpoints**
The RFI tool uses the **BIM360 RFI API v2** format:
```
https://developer.api.autodesk.com/bim360/rfis/v2/containers/{containerId}/rfis
```
- For ACC projects: `containerId = projectId` (without 'b.' prefix)
- Requires 3-legged OAuth token
- Returns standardized RFI data structure

### **Submittal API Endpoints**
The submittal tool attempts **multiple endpoint formats**:
```
1. https://developer.api.autodesk.com/construction/submittals/v1/projects/{projectId}/items
2. https://developer.api.autodesk.com/bim360/submittals/v1/containers/{projectId}/items  
3. https://developer.api.autodesk.com/construction/submittals/v1/containers/{projectId}/items
```
- Tool automatically detects working endpoint
- Gracefully handles API availability variations
- Reports which endpoint was successful in response metadata

---

## 🔍 **Error Scenarios & Troubleshooting**

### **Common Error Conditions**

#### Authentication Errors (401)
- **Cause**: OAuth token expired or invalid
- **Resolution**: Re-authenticate (browser will open automatically)
- **Test**: Try accessing after token expiration

#### Authorization Errors (403)
- **Cause**: User lacks RFI/submittal permissions in project
- **Resolution**: Contact project administrator for access rights
- **Test**: Use account without proper project role

#### Not Found Errors (404)
- **Cause**: No RFIs/submittals in project, or API not available
- **Expected**: Graceful handling with informative error messages
- **Test**: Use empty project or project without modules enabled

#### API Endpoint Errors
- **Submittal Tool**: Multiple endpoints tried automatically
- **RFI Tool**: Uses established BIM360 endpoint format
- **Expected**: Clear error messages with troubleshooting tips

---

## 📊 **Expected Response Formats**

### **RFI Response Structure**
```json
{
  "containerId": "project-id",
  "summary": {
    "totalRfis": 0,
    "withCostImpact": 0,
    "withScheduleImpact": 0,
    "overdue": 0
  },
  "statusBreakdown": [
    {"status": "open", "count": 0, "percentage": 0}
  ],
  "rfis": [...]
}
```

### **Submittal Response Structure**
```json
{
  "projectId": "project-id", 
  "summary": {
    "totalSubmittals": 0,
    "withCustomIdentifiers": 0,
    "pending": 0,
    "approved": 0,
    "overdue": 0
  },
  "statusBreakdown": [...],
  "submittals": [...],
  "_metadata": {
    "endpointUsed": "working-api-endpoint",
    "apiVersion": "v1"
  }
}
```

---

## 🚀 **Testing Checklist**

### Pre-Testing Setup
- [ ] ACC MCP Server built and running (`npm run build`)
- [ ] Claude Desktop configured with server
- [ ] OAuth credentials configured in `.env` file
- [ ] Test project accessible with proper user permissions

### RFI Tool Testing
- [ ] Basic RFI listing (empty project scenario)
- [ ] Status filtering functionality
- [ ] Error handling for missing permissions
- [ ] OAuth authentication flow
- [ ] Response structure validation

### Submittal Tool Testing  
- [ ] Basic submittal listing (empty project scenario)
- [ ] API endpoint auto-detection functionality
- [ ] Status filtering and custom identifier support
- [ ] Error handling and graceful degradation
- [ ] Response metadata validation

### Integration Testing
- [ ] Multiple OAuth tools in same session (token reuse)
- [ ] Mixed service account and OAuth tool usage
- [ ] Token refresh functionality
- [ ] Error recovery and retry logic

---

## 📋 **Test Project Recommendations**

### Test Project Setup
- **Empty Project**: Test "no data" scenarios and error handling
- **Active Project**: Test with actual RFIs and submittals if available
- **Multi-Role Testing**: Test with different user permission levels

### User Permission Requirements
- **RFI Access**: User must have RFI read permissions in project
- **Submittal Access**: User must have submittal read permissions in project
- **Project Membership**: User must be assigned to project (not just account)

---

## 🎯 **Success Criteria**

### Functional Requirements
- ✅ Tools execute without compilation errors
- ✅ OAuth authentication completes successfully
- ✅ API calls return structured data or informative errors
- ✅ Response formats match expected schemas
- ✅ Error messages provide actionable troubleshooting guidance

### Construction Management Requirements
- ✅ RFI data includes cost/schedule impact tracking
- ✅ Submittal data includes approval workflow status
- ✅ Status breakdowns provide project oversight capabilities
- ✅ Custom identifiers support project numbering schemes
- ✅ Response tracking enables collaboration workflows

---

*Testing guide prepared for ACC MCP Server OAuth tool validation*
*Next Update: After initial testing results*
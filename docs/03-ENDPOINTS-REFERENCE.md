# ACC API Endpoints Reference - 2025 Edition

## Base URLs
- **Production**: `https://developer.api.autodesk.com`
- **Authentication**: `https://developer.api.autodesk.com/authentication/v2`

## Account & Project Management

### Get Accounts (2-Legged)
```
GET /construction/admin/v1/accounts
Authorization: Bearer {2-legged-token}
```

### Get Projects (2-Legged)
```
GET /construction/admin/v1/accounts/{account_id}/projects
Authorization: Bearer {2-legged-token}
```

### Get Project Users (2-Legged) 
```
GET /construction/admin/v1/projects/{project_id}/users
Authorization: Bearer {2-legged-token}
```
**Note**: This API has known pagination issues. Monitor response headers for proper pagination.

## Issues API (3-Legged Required)

### List Issues
```
GET /construction/issues/v1/projects/{project_id}/issues
Authorization: Bearer {3-legged-token}

Query Parameters:
- filter[created_at]: Date filter (gte:2024-01-01, lte:2024-12-31)
- filter[updated_at]: Date filter  
- filter[status]: open, draft, closed, void
- filter[assignee]: User ID
- filter[issueType]: Issue type ID
- page[limit]: 1-200 (default: 100)
- page[offset]: Pagination offset
- include: attachments, comments, linkedDocuments
```

### Get Issue Details
```
GET /construction/issues/v1/projects/{project_id}/issues/{issue_id}
Authorization: Bearer {3-legged-token}
```

### Create Issue
```
POST /construction/issues/v1/projects/{project_id}/issues
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "title": "Issue Title",
  "description": "Issue description",
  "issueTypeId": "issue-type-uuid",
  "status": "draft",
  "assignedTo": "user-id",
  "dueDate": "2025-06-30T23:59:59Z",
  "priority": "high",
  "customAttributes": {
    "custom-field-id": "value"
  },
  "linkedDocuments": [
    {
      "type": "File",
      "id": "file-urn-id"
    }
  ]
}
```

### Update Issue
```
PATCH /construction/issues/v1/projects/{project_id}/issues/{issue_id}
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "open",
  "assignedTo": "new-user-id"
}
```

### Get Issue Types
```
GET /construction/issues/v1/projects/{project_id}/issue-types
Authorization: Bearer {3-legged-token}

Query Parameters:
- include: subtypes (REQUIRED to get subtypes data - this is a known API quirk)
```

### Get Issue Comments
```
GET /construction/issues/v1/projects/{project_id}/issues/{issue_id}/comments
Authorization: Bearer {3-legged-token}
```

### Create Issue Comment
```
POST /construction/issues/v1/projects/{project_id}/issues/{issue_id}/comments
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "body": "Comment text",
  "attachments": [
    {
      "name": "file.pdf",
      "url": "download-url"
    }
  ]
}
```

## RFIs API (3-Legged Required) - Updated 2024/2025

### List RFIs
```
GET /construction/rfis/v2/projects/{project_id}/rfis
Authorization: Bearer {3-legged-token}

Query Parameters:
- filter[status]: open, answered, closed, void
- filter[created_at]: Date filter
- filter[number]: RFI number filter
- filter[assignee]: User ID
- page[limit]: 1-200 (default: 100)
- page[offset]: Pagination offset
- include: attachments, responses, linkedDocuments
```

### Get RFI Details
```
GET /construction/rfis/v2/projects/{project_id}/rfis/{rfi_id}
Authorization: Bearer {3-legged-token}
```

### Create RFI
```
POST /construction/rfis/v2/projects/{project_id}/rfis
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "subject": "RFI Subject",
  "question": "Detailed question text",
  "assignedTo": "user-id",
  "dueDate": "2025-06-30T23:59:59Z",
  "priority": "high",
  "category": "Design",
  "customAttributes": {
    "Location": "Building A - Floor 2"
  },
  "attachments": [
    {
      "name": "drawing.pdf",
      "url": "file-url"
    }
  ]
}
```

### Create RFI Response
```
POST /construction/rfis/v2/projects/{project_id}/rfis/{rfi_id}/responses
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "answer": "Response text",
  "status": "answered",
  "attachments": [
    {
      "name": "response-doc.pdf", 
      "url": "file-url"
    }
  ]
}
```

## Submittals API (3-Legged Required) - Major Updates 2024/2025

### List Submittal Items
```
GET /construction/submittals/v1/projects/{project_id}/items
Authorization: Bearer {3-legged-token}

Query Parameters:
- filter[status]: draft, submitted, reviewed, approved, rejected, closed
- filter[created_at]: Date filter
- filter[package]: Package ID
- filter[customIdentifier]: Custom identifier filter
- page[limit]: 1-200 (default: 100)
- page[offset]: Pagination offset
- include: attachments, responses, specs, packages
```

### Get Submittal Item Details
```
GET /construction/submittals/v1/projects/{project_id}/items/{item_id}
Authorization: Bearer {3-legged-token}
```

### Create Submittal Item (NEW - Write API Available)
```
POST /construction/submittals/v1/projects/{project_id}/items
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "name": "Submittal Item Name",
  "description": "Item description",
  "packageId": "package-uuid",
  "specSectionId": "spec-section-uuid",
  "status": "draft",
  "customIdentifier": "SI-001",
  "dueDate": "2025-06-30T23:59:59Z",
  "customAttributes": {
    "Manufacturer": "ACME Corp",
    "Model": "XYZ-123"
  },
  "attachments": [
    {
      "name": "product-spec.pdf",
      "url": "file-url"
    }
  ]
}
```

### Create Submittal Spec (NEW - Write API Available)
```
POST /construction/submittals/v1/projects/{project_id}/specs
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "name": "Spec Section Name",
  "number": "03300",
  "description": "Cast-in-Place Concrete"
}
```

### Validate Custom Identifier (NEW)
```
POST /construction/submittals/v1/projects/{project_id}/items:validate-custom-identifier
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "customIdentifier": "SI-002"
}
```

### Get Next Custom Identifier (NEW)
```
GET /construction/submittals/v1/projects/{project_id}/items:next-custom-identifier
Authorization: Bearer {3-legged-token}
```

### Get Submittal Item Types
```
GET /construction/submittals/v1/projects/{project_id}/item-types
Authorization: Bearer {3-legged-token}
```

### Get Submittal Packages
```
GET /construction/submittals/v1/projects/{project_id}/packages
Authorization: Bearer {3-legged-token}
```

### Get Submittal Responses
```
GET /construction/submittals/v1/projects/{project_id}/items/{item_id}/responses
Authorization: Bearer {3-legged-token}
```

## Forms API (3-Legged Required)

### List Forms
```
GET /construction/forms/v1/projects/{project_id}/forms
Authorization: Bearer {3-legged-token}

Query Parameters:
- filter[status]: draft, completed, discarded
- filter[template]: Template ID
- filter[location]: Location ID array (Note: limit parameter may be ignored when filtering by location)
- page[limit]: 1-200 (default: 100)
- page[offset]: Pagination offset
- include: template, submissions, customAttributes
```

**Known Issues:**
- `limit` parameter is ignored when filtering by `locationIds`
- `nextUrl` pagination may not work properly in some cases
- Query by statuses array is not properly supported

### Get Form Details
```
GET /construction/forms/v1/projects/{project_id}/forms/{form_id}
Authorization: Bearer {3-legged-token}
```

### Get Form Templates
```
GET /construction/forms/v1/projects/{project_id}/templates
Authorization: Bearer {3-legged-token}
```

## Data Management API (Files & Folders) - 3-Legged Required

### Get Project Top Folders
```
GET /project/v1/hubs/{hub_id}/projects/{project_id}/topFolders
Authorization: Bearer {3-legged-token}
```

### Get Folder Contents
```
GET /project/v1/hubs/{hub_id}/projects/{project_id}/folders/{folder_id}/contents
Authorization: Bearer {3-legged-token}

Query Parameters:
- page[number]: Page number
- page[size]: Items per page (max 200)
- filter[extension.type]: File extension filter
```

### Get Item Versions
```
GET /project/v1/hubs/{hub_id}/projects/{project_id}/items/{item_id}/versions
Authorization: Bearer {3-legged-token}
```

### Search Files (2-Legged Support Limited)
```
GET /project/v1/hubs/{hub_id}/projects/{project_id}/folders/{folder_id}/search
Authorization: Bearer {3-legged-token}

Query Parameters:
- q: Search query
- filter[extension.type]: File type filter
```
**Note**: 2-legged access to search endpoint is requested but not yet available.

## Model Properties API

### Get Index Manifest
```
GET /construction/index/v2/projects/{project_id}/indexes:manifest
Authorization: Bearer {3-legged-token}
```

### Query Properties
```
POST /construction/index/v2/projects/{project_id}/indexes:query
Authorization: Bearer {3-legged-token}
Content-Type: application/json

{
  "query": {
    "$and": [
      {
        "p20d8441e": {
          "$eq": "Wall"
        }
      }
    ]
  }
}
```

## Cost Management API (2-Legged)

### Get Budget Code Templates
```
GET /construction/cost/v1/projects/{project_id}/budget-code-templates
Authorization: Bearer {2-legged-token}
```

### Get Budget Codes
```
GET /construction/cost/v1/projects/{project_id}/budget-codes
Authorization: Bearer {2-legged-token}
```

## Rate Limiting Headers

All API responses include rate limiting headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## Common Query Parameters

### Pagination
- `page[limit]` or `page[size]`: Items per page (typically 1-200, default varies)
- `page[offset]` or `page[number]`: Pagination offset or page number

### Filtering
- `filter[created_at]`: Date filters using `gte:YYYY-MM-DD`, `lte:YYYY-MM-DD`
- `filter[updated_at]`: Date filters
- `filter[status]`: Status filters (values vary by endpoint)

### Inclusion
- `include`: Comma-separated list of related resources to include

## Authentication Requirements Summary

| Endpoint Category | Auth Type | Notes |
|-------------------|-----------|-------|
| Account Admin | 2-Legged | Account admin access required |
| Project Admin | 2-Legged | Project admin context |  
| Issues | 3-Legged | User context required |
| RFIs | 3-Legged | User workflows |
| Submittals | 3-Legged | Review processes |
| Forms | 3-Legged | User submissions |
| Files/Folders | 3-Legged | User access permissions |
| Model Properties | 3-Legged | Design data access |
| Cost Management | 2-Legged | Admin-level access |

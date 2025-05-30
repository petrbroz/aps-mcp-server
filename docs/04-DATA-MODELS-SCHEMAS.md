# ACC API Data Models and JSON Response Schemas - 2025 Edition

## Authentication Response Models

### 2-Legged Token Response
```json
{
  "access_token": "eyJhbGc..........IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "account:read account:write data:read"
}
```

### 3-Legged Token Response
```json
{
  "access_token": "eyJhbGc..........IkpXVCJ9...",
  "refresh_token": "def50200abc123...",
  "token_type": "Bearer", 
  "expires_in": 3600,
  "scope": "data:read data:write user-profile:read"
}
```

## Account and Project Models

### Account Response
```json
{
  "id": "b.a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Construction Company LLC",
  "region": "US",
  "accountType": "business",
  "createdAt": "2023-01-15T10:30:00Z",
  "updatedAt": "2024-12-01T14:22:00Z"
}
```

### Project Response
```json
{
  "id": "b.a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Downtown Office Complex",
  "description": "Multi-story office building construction",
  "status": "active",
  "classification": "building_construction",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "createdAt": "2023-12-01T10:30:00Z",
  "updatedAt": "2024-12-15T16:45:00Z",
  "currency": "USD",
  "timezone": "America/Los_Angeles",
  "addressLine1": "123 Main Street",
  "addressLine2": "Suite 100",
  "city": "Seattle",
  "stateOrProvince": "WA",
  "postalCode": "98101",
  "country": "United States"
}
```

### Project User Response
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@company.com",
  "name": "John Smith",
  "firstName": "John",
  "lastName": "Smith",
  "roleId": "project_admin",
  "roleName": "Project Administrator",
  "companyId": "company-uuid",
  "companyName": "Contractor Inc",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-12-01T14:22:00Z"
}
```

## Issues API Models

### Issue List Response
```json
{
  "results": [
    {
      "id": "issue-uuid",
      "title": "Concrete placement issue",
      "description": "Concrete pour scheduled conflicts with weather forecast",
      "number": "ISS-001",
      "status": "open",
      "priority": "high",
      "createdAt": "2024-12-01T08:30:00Z",
      "updatedAt": "2024-12-01T14:22:00Z",
      "dueDate": "2024-12-15T17:00:00Z",
      "closedAt": null,
      "assignedTo": "user-uuid",
      "assignedToName": "Jane Doe",
      "createdBy": "creator-uuid",
      "createdByName": "John Smith",
      "issueTypeId": "type-uuid",
      "issueTypeName": "Construction Issue",
      "locationId": "location-uuid",
      "locationName": "Building A - Level 2",
      "workflowAttributesVersion": 1,
      "customAttributes": {
        "Trade": "Concrete",
        "Severity": "High",
        "EstimatedCost": "$5,000"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "totalResults": 1
  }
}
```

### Issue Details Response
```json
{
  "id": "issue-uuid",
  "title": "Concrete placement issue",
  "description": "Detailed description of the concrete placement scheduling conflict...",
  "number": "ISS-001",
  "status": "open",
  "priority": "high",
  "createdAt": "2024-12-01T08:30:00Z",
  "updatedAt": "2024-12-01T14:22:00Z",
  "dueDate": "2024-12-15T17:00:00Z",
  "closedAt": null,
  "assignedTo": "user-uuid",
  "assignedToName": "Jane Doe",
  "assignedToType": "User",
  "createdBy": "creator-uuid",
  "createdByName": "John Smith",
  "issueTypeId": "type-uuid",
  "issueTypeName": "Construction Issue",
  "issueSubtypeId": "subtype-uuid",
  "issueSubtypeName": "Scheduling Conflict",
  "locationId": "location-uuid",
  "locationName": "Building A - Level 2",
  "rootCauseId": "cause-uuid",
  "workflowAttributesVersion": 1,
  "customAttributes": {
    "Trade": "Concrete",
    "Severity": "High",
    "EstimatedCost": "$5,000",
    "ContractorResponse": "Investigating weather window options"
  },
  "linkedDocuments": [
    {
      "type": "File",
      "id": "file-urn",
      "name": "concrete-schedule.pdf",
      "details": {
        "viewable": {
          "guid": "viewable-guid"
        }
      }
    }
  ],
  "attachments": [
    {
      "id": "attachment-uuid",
      "name": "weather-forecast.pdf",
      "url": "https://download-url",
      "createdAt": "2024-12-01T08:35:00Z"
    }
  ]
}
```

### Issue Type Response
```json
{
  "results": [
    {
      "id": "type-uuid",
      "name": "Construction Issue",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-06-01T12:00:00Z",
      "subtypes": [
        {
          "id": "subtype-uuid",
          "name": "Scheduling Conflict",
          "isActive": true
        },
        {
          "id": "subtype-uuid-2", 
          "name": "Material Quality",
          "isActive": true
        }
      ]
    }
  ]
}
```

## RFIs API Models

### RFI List Response
```json
{
  "results": [
    {
      "id": "rfi-uuid",
      "number": "RFI-001",
      "subject": "Clarification needed on structural beam detail",
      "question": "Drawing A-101 shows conflicting dimensions for beam B-12...",
      "status": "open",
      "priority": "medium",
      "category": "Design",
      "createdAt": "2024-11-15T09:00:00Z",
      "updatedAt": "2024-11-20T14:30:00Z",
      "dueDate": "2024-12-01T17:00:00Z",
      "assignedTo": "architect-uuid",
      "assignedToName": "Sarah Johnson",
      "createdBy": "contractor-uuid",
      "createdByName": "Mike Wilson",
      "customAttributes": {
        "Location": "Building A - Floor 3",
        "Trade": "Structural",
        "DrawingReference": "A-101, S-201"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "totalResults": 1
  }
}
```

### RFI Details Response  
```json
{
  "id": "rfi-uuid",
  "number": "RFI-001",
  "subject": "Clarification needed on structural beam detail",
  "question": "Drawing A-101 shows conflicting dimensions for beam B-12. Sheet A-101 indicates 18\" depth while S-201 shows 16\" depth. Please clarify which dimension is correct for fabrication.",
  "status": "answered",
  "priority": "medium",
  "category": "Design",
  "createdAt": "2024-11-15T09:00:00Z",
  "updatedAt": "2024-11-25T10:15:00Z",
  "dueDate": "2024-12-01T17:00:00Z",
  "answeredAt": "2024-11-25T10:15:00Z",
  "assignedTo": "architect-uuid",
  "assignedToName": "Sarah Johnson",
  "createdBy": "contractor-uuid", 
  "createdByName": "Mike Wilson",
  "customAttributes": {
    "Location": "Building A - Floor 3",
    "Trade": "Structural",
    "DrawingReference": "A-101, S-201",
    "ImpactOnSchedule": "2 days potential delay"
  },
  "attachments": [
    {
      "id": "attachment-uuid",
      "name": "beam-detail-markup.pdf",
      "url": "https://download-url",
      "createdAt": "2024-11-15T09:05:00Z"
    }
  ],
  "responses": [
    {
      "id": "response-uuid",
      "answer": "The correct beam depth is 18\" as shown on A-101. Drawing S-201 will be revised in the next drawing update. Please proceed with 18\" depth for fabrication.",
      "status": "answered",
      "createdAt": "2024-11-25T10:15:00Z",
      "createdBy": "architect-uuid",
      "createdByName": "Sarah Johnson",
      "attachments": [
        {
          "id": "response-attachment-uuid",
          "name": "revised-beam-detail.pdf",
          "url": "https://download-url"
        }
      ]
    }
  ]
}
```

## Submittals API Models - Updated 2024/2025

### Submittal Items List Response
```json
{
  "results": [
    {
      "id": "item-uuid",
      "name": "Concrete Mix Design",
      "number": "SUB-001", 
      "customIdentifier": "SI-2024-001",
      "customIdentifierHumanReadable": "SI-2024-001",
      "description": "Mix design for structural concrete",
      "status": "submitted",
      "createdAt": "2024-11-01T08:00:00Z",
      "updatedAt": "2024-11-15T16:30:00Z",
      "dueDate": "2024-12-01T17:00:00Z",
      "submittedAt": "2024-11-10T14:00:00Z",
      "packageId": "package-uuid",
      "packageName": "Concrete Package A",
      "specSectionId": "spec-uuid",
      "specSectionNumber": "03300",
      "specSectionName": "Cast-in-Place Concrete",
      "submittedBy": "contractor-uuid",
      "submittedByName": "ABC Concrete Corp",
      "reviewedBy": "engineer-uuid", 
      "reviewedByName": "John Engineer",
      "customAttributes": {
        "Manufacturer": "Portland Cement Co",
        "SpecStrength": "4000 PSI",
        "SlumpRequirement": "4 inches"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "totalResults": 1
  }
}
```

### Submittal Item Details Response
```json
{
  "id": "item-uuid",
  "name": "Concrete Mix Design",
  "number": "SUB-001",
  "customIdentifier": "SI-2024-001", 
  "customIdentifierHumanReadable": "SI-2024-001",
  "description": "Comprehensive mix design for all structural concrete elements including columns, beams, and slabs",
  "status": "approved",
  "ball_in_court": "contractor",
  "createdAt": "2024-11-01T08:00:00Z",
  "updatedAt": "2024-11-20T11:45:00Z",
  "dueDate": "2024-12-01T17:00:00Z",
  "submittedAt": "2024-11-10T14:00:00Z",
  "reviewedAt": "2024-11-20T11:45:00Z",
  "packageId": "package-uuid",
  "packageName": "Concrete Package A",
  "specSectionId": "spec-uuid",
  "specSectionNumber": "03300",
  "specSectionName": "Cast-in-Place Concrete",
  "itemTypeId": "type-uuid",
  "itemTypeName": "Product Data",
  "submittedBy": "contractor-uuid",
  "submittedByName": "ABC Concrete Corp",
  "reviewedBy": "engineer-uuid",
  "reviewedByName": "John Engineer",
  "customAttributes": {
    "Manufacturer": "Portland Cement Co",
    "SpecStrength": "4000 PSI", 
    "SlumpRequirement": "4 inches",
    "AirContent": "6% ± 1%",
    "AggregateSource": "Local Quarry A"
  },
  "attachments": [
    {
      "id": "attachment-uuid",
      "name": "mix-design-report.pdf",
      "url": "https://download-url",
      "createdAt": "2024-11-01T08:15:00Z"
    },
    {
      "id": "attachment-uuid-2",
      "name": "test-results.pdf", 
      "url": "https://download-url-2",
      "createdAt": "2024-11-05T10:30:00Z"
    }
  ]
}
```

### Submittal Package Response
```json
{
  "results": [
    {
      "id": "package-uuid",
      "name": "Concrete Package A",
      "description": "All concrete related submittals for Phase 1",
      "createdAt": "2024-10-01T00:00:00Z",
      "updatedAt": "2024-11-01T12:00:00Z",
      "itemCount": 12,
      "status": "active"
    }
  ]
}
```

### Submittal Response Model
```json
{
  "id": "response-uuid",
  "status": "approved_with_comments",
  "comments": "Approved for construction with noted corrections on page 3. Ensure aggregate gradation meets ASTM C33 requirements.",
  "createdAt": "2024-11-20T11:45:00Z",
  "createdBy": "engineer-uuid",
  "createdByName": "John Engineer",
  "reviewDate": "2024-11-20T11:45:00Z",
  "attachments": [
    {
      "id": "response-attachment-uuid",
      "name": "review-comments.pdf",
      "url": "https://download-url"
    }
  ]
}
```

## Forms API Models

### Form List Response
```json
{
  "results": [
    {
      "id": "form-uuid",
      "title": "Daily Safety Inspection",
      "status": "completed",
      "templateId": "template-uuid",
      "templateName": "Daily Safety Checklist v2.1",
      "createdAt": "2024-12-01T07:00:00Z",
      "updatedAt": "2024-12-01T17:30:00Z",
      "completedAt": "2024-12-01T17:30:00Z",
      "createdBy": "inspector-uuid",
      "createdByName": "Safety Inspector",
      "locationId": "location-uuid",
      "locationName": "Building A - Floor 2",
      "customAttributes": {
        "Weather": "Clear, 68°F",
        "CrewSize": "12",
        "Supervisor": "Mike Johnson"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "totalResults": 1
  }
}
```

### Form Details Response
```json
{
  "id": "form-uuid",
  "title": "Daily Safety Inspection", 
  "status": "completed",
  "templateId": "template-uuid",
  "templateName": "Daily Safety Checklist v2.1",
  "createdAt": "2024-12-01T07:00:00Z",
  "updatedAt": "2024-12-01T17:30:00Z",
  "completedAt": "2024-12-01T17:30:00Z",
  "createdBy": "inspector-uuid",
  "createdByName": "Safety Inspector",
  "locationId": "location-uuid",
  "locationName": "Building A - Floor 2",
  "submissions": [
    {
      "id": "submission-uuid",
      "fieldId": "field-uuid",
      "fieldName": "Personal Protective Equipment Check",
      "fieldType": "multiple_choice",
      "value": ["Hard hats", "Safety glasses", "Steel-toed boots"],
      "submittedAt": "2024-12-01T08:15:00Z"
    },
    {
      "id": "submission-uuid-2",
      "fieldId": "field-uuid-2", 
      "fieldName": "Hazard Observations",
      "fieldType": "text",
      "value": "No hazards observed. All safety protocols being followed.",
      "submittedAt": "2024-12-01T08:20:00Z"
    },
    {
      "id": "submission-uuid-3",
      "fieldId": "field-uuid-3",
      "fieldName": "Safety Score",
      "fieldType": "number",
      "value": 95,
      "submittedAt": "2024-12-01T08:25:00Z"
    }
  ],
  "customAttributes": {
    "Weather": "Clear, 68°F",
    "CrewSize": "12",
    "Supervisor": "Mike Johnson",
    "InspectionDuration": "45 minutes"
  }
}
```

## File Management Models

### Folder Contents Response
```json
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": [
    {
      "type": "items",
      "id": "urn:adsk.wipprod:dm.lineage:abc123",
      "attributes": {
        "name": "Floor Plans.dwg",
        "displayName": "Floor Plans",
        "createTime": "2024-11-01T10:30:00Z",
        "createUserId": "user-uuid",
        "createUserName": "Jane Architect",
        "lastModifiedTime": "2024-11-15T14:22:00Z",
        "lastModifiedUserId": "user-uuid-2",
        "lastModifiedUserName": "John Drafter",
        "versionNumber": 3,
        "mimeType": "application/acad",
        "fileType": "dwg",
        "storageSize": 2547328,
        "extension": {
          "type": "items:autodesk.core:File",
          "version": "1.0",
          "data": {
            "description": "Latest floor plan revisions",
            "customAttributes": {
              "Drawing Number": "A-101",
              "Revision": "C",
              "Scale": "1/8\" = 1'-0\""
            }
          }
        }
      },
      "relationships": {
        "tip": {
          "data": {
            "type": "versions",
            "id": "urn:adsk.wipprod:fs.file:vf.abc123?version=3"
          }
        }
      }
    }
  ],
  "meta": {
    "totalCount": 1
  }
}
```

## Error Response Models

### Standard Error Response
```json
{
  "errors": [
    {
      "id": "error-uuid",
      "status": "400",
      "code": "INVALID_REQUEST",
      "title": "Bad Request",
      "detail": "The 'issueTypeId' field is required",
      "source": {
        "pointer": "/data/attributes/issueTypeId"
      },
      "meta": {
        "timestamp": "2024-12-01T15:30:00Z",
        "requestId": "req-uuid"
      }
    }
  ]
}
```

### Authentication Error Response
```json
{
  "errors": [
    {
      "status": "401",
      "code": "UNAUTHORIZED", 
      "title": "Authentication Required",
      "detail": "Access token is invalid or expired",
      "meta": {
        "timestamp": "2024-12-01T15:30:00Z"
      }
    }
  ]
}
```

### Rate Limit Error Response
```json
{
  "errors": [
    {
      "status": "429",
      "code": "RATE_LIMIT_EXCEEDED",
      "title": "Too Many Requests",
      "detail": "Rate limit exceeded. Try again later.",
      "meta": {
        "retryAfter": 60,
        "limit": 100,
        "remaining": 0,
        "resetTime": "2024-12-01T15:31:00Z"
      }
    }
  ]
}
```

## Custom Attributes Pattern

Most ACC entities support custom attributes with this consistent pattern:
```json
{
  "customAttributes": {
    "field-name-or-id": "string-value",
    "numeric-field": 123.45,
    "dropdown-field": "selected-option",
    "multi-select-field": ["option1", "option2"],
    "date-field": "2024-12-01T00:00:00Z",
    "boolean-field": true
  }
}
```

## Pagination Patterns

### Offset-based Pagination (Most Common)
```json
{
  "pagination": {
    "limit": 100,
    "offset": 0,
    "totalResults": 250
  }
}
```

### Page-based Pagination (Data Management API)
```json
{
  "meta": {
    "totalCount": 250
  },
  "links": {
    "next": "/api/endpoint?page[number]=2&page[size]=50",
    "prev": null,
    "first": "/api/endpoint?page[number]=1&page[size]=50",
    "last": "/api/endpoint?page[number]=5&page[size]=50"
  }
}
```

## Common Field Types and Validation

### Date Fields
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- Always in UTC timezone
- Nullable fields may return `null`

### UUID Fields  
- Format: Standard UUID v4 format
- Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Status Fields
- Issues: `draft`, `open`, `closed`, `void`
- RFIs: `open`, `answered`, `closed`, `void`  
- Submittals: `draft`, `submitted`, `reviewed`, `approved`, `rejected`, `closed`
- Forms: `draft`, `completed`, `discarded`

### Priority Fields
- Common values: `low`, `medium`, `high`, `critical`
- Some endpoints may use numeric scales (1-5)

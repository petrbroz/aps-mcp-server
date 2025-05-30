# Schedule and Work Planning API Reference - 2025 Edition

## Current Status: Limited Public API Access

**⚠️ IMPORTANT**: While Autodesk Build has extensive scheduling capabilities in the web interface, the Schedule API is **not yet publicly available**. However, internal endpoints exist and public APIs are planned for 2025.

## Discovered Internal Endpoints (Not Public)

From Stack Overflow research and community discussions, these internal endpoints have been identified:

```
POST https://developer.api.autodesk.com/construction/schedule/v1/projects/{project_id}/schedules:upload
```

**Status**: Internal use only - not accessible via standard OAuth workflows
**Purpose**: Handle schedule imports (.xer, .xml, .mpp files)
**Community Request**: Make this endpoint publicly available

## Current Schedule Capabilities in Autodesk Build

### Schedule Management Features
- **File Format Support**: Import from Primavera P6 (.xer, .xml), Microsoft Project (.mpp, .xml), and Asta Powerproject (.pp)
- **Version Comparison**: Visually stack up to 5 different schedule versions
- **Mobile Access**: Full schedule viewing and editing on iOS/Android
- **Comments & Collaboration**: Comment on specific activities with @mentions
- **Filtering & Search**: Search through thousands of activities
- **Custom Views**: Gantt chart and list view options

### Work Planning Features (Released 2024)
- **Connected Work Plans**: Link work plans to master schedule milestones
- **Independent Work Plans**: Create standalone work plans
- **Task Management**: Break down activities into sub-tasks
- **Field Updates**: Update progress and completion % from mobile
- **Look-ahead Planning**: 1-week, 2-week, or 3-week views
- **Lean Construction**: Built-in lean construction principles

### Schedule Comparison & Analysis
- **Multi-Version Comparison**: Compare up to 5 schedule versions simultaneously
- **Change Detection**: Identify activities that are:
  - Delayed or pulled forward
  - Newly added or removed
  - Name changes (scope changes)
  - Duration changes
- **Preset Filters**: Specialized filters for comparison mode
- **Stakeholder Sharing**: Share filtered comparison views via email links

### Integration Capabilities
- **Cost Integration**: Link schedule activities to budget line items
- **Cash Flow Analysis**: Forecast distribution curves for cost planning
- **Reference Linking**: Connect Files, Photos, Issues, Sheets, Assets to activities
- **Location-Based Planning**: Tie activities to specific building locations

## Planned Schedule API Development (2025-2026 Roadmap)

### Q2-Q3 2025: Schedule Integration API
**Expected Features**:
- Direct integration with Schedule/Work Planning
- Task-based issue and RFI creation
- Schedule impact analysis from changes
- Resource allocation optimization
- Critical path monitoring

**Potential Endpoints**:
```javascript
// Hypothetical future endpoints based on roadmap
GET    /construction/schedule/v1/projects/{projectId}/schedules
GET    /construction/schedule/v1/projects/{projectId}/schedules/{scheduleId}
POST   /construction/schedule/v1/projects/{projectId}/schedules:upload
GET    /construction/schedule/v1/projects/{projectId}/schedules/{scheduleId}/activities
POST   /construction/schedule/v1/projects/{projectId}/schedules/{scheduleId}/activities/{activityId}/comments
GET    /construction/schedule/v1/projects/{projectId}/workplans
POST   /construction/schedule/v1/projects/{projectId}/workplans
PATCH  /construction/schedule/v1/projects/{projectId}/workplans/{planId}/tasks/{taskId}
```

### Integration with Existing APIs
**Current Workarounds** (Available Now):
- Link schedule activities to Issues, RFIs, and Submittals via reference fields
- Use Data Connector API to extract schedule-related data
- Integrate with Cost Management API for schedule-cost linking

## Current Workarounds for Schedule Integration

### 1. Using References in Other APIs
You can reference schedule activities in Issues, RFIs, and Submittals:

```javascript
// Create Issue with Schedule Reference
const issueData = {
  title: "Concrete delay affecting Schedule Activity XYZ",
  description: "Schedule activity ABC-123 is delayed due to weather",
  customAttributes: {
    "Schedule Activity ID": "ABC-123",
    "Schedule Impact": "2 day delay",
    "Critical Path": "Yes"
  },
  linkedDocuments: [
    {
      type: "Schedule Activity", // Custom reference type
      id: "schedule-activity-uuid"
    }
  ]
};
```

### 2. Data Connector API for Schedule Data
```javascript
// Extract schedule data using Data Connector
const scheduleData = await fetch('/construction/insights/v1/projects/{projectId}/queries', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    query: {
      from: "schedule_activities",
      select: ["activity_name", "start_date", "end_date", "percent_complete", "status"],
      where: {
        "project_id": projectId,
        "last_updated": { "gte": "2024-01-01" }
      }
    }
  })
});
```

### 3. Cost Management Integration
```javascript
// Link schedule to cost data (existing capability)
const costScheduleIntegration = await fetch('/construction/cost/v1/projects/{projectId}/budget-items', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    scheduleActivityId: "activity-uuid",
    plannedStartDate: "2024-06-01",
    plannedEndDate: "2024-06-15"
  })
});
```

## Web Interface Capabilities (Reference for Future API)

### Schedule Upload Process
1. **Supported Formats**: .xer, .xml (Primavera P6), .mpp, .xml (MS Project), .pp (Asta)
2. **Import Process**: 
   - File validation and parsing
   - Activity structure mapping
   - Resource and calendar import
   - Baseline preservation
3. **Version Control**: Automatic versioning with comparison capabilities

### Comment System
```javascript
// Future API structure (hypothetical)
const commentData = {
  activityId: "activity-uuid",
  comment: "This activity is delayed due to material delivery",
  mentions: ["@john.smith", "@sarah.jones"],
  attachments: [
    { name: "delivery-notice.pdf", url: "..." }
  ],
  priority: "high",
  impactType: "delay"
};
```

### Work Plan Structure
```javascript
// Future work plan data model (hypothetical)
const workPlan = {
  id: "workplan-uuid",
  name: "Week 12 - Concrete Pour",
  type: "connected", // or "independent"
  parentScheduleId: "schedule-uuid",
  activities: [
    {
      id: "task-uuid",
      name: "Concrete preparation",
      parentActivityId: "schedule-activity-uuid", // if connected
      startDate: "2024-06-10T08:00:00Z",
      endDate: "2024-06-10T12:00:00Z",
      assignedTo: "crew-leader-uuid",
      status: "in_progress",
      percentComplete: 75,
      location: "Building A - Floor 2",
      workType: "concrete",
      subtasks: [
        {
          name: "Set up forms",
          status: "completed",
          completedAt: "2024-06-10T10:00:00Z"
        }
      ]
    }
  ],
  lookAheadPeriod: "2_weeks",
  createdBy: "user-uuid",
  lastUpdated: "2024-06-10T14:30:00Z"
};
```

## Integration Opportunities for MCP Server

### Immediate (Using Existing APIs)
1. **Issue-Schedule Integration**: Create issues that reference schedule impacts
2. **RFI-Schedule Linking**: Include schedule activity context in RFIs
3. **Cost-Schedule Analysis**: Use Cost Management API for time-based budgeting
4. **Data Extraction**: Use Data Connector for schedule reporting

### Future (When Schedule API Releases)
1. **Automated Schedule Updates**: Push progress updates from field data
2. **Risk Analysis**: Identify schedule conflicts and delays
3. **Resource Optimization**: Balance resources across activities
4. **Critical Path Monitoring**: Alert on critical path changes

## Community Requests and Feature Wishlist

Based on Stack Overflow and community feedback:

### High Priority Requests
1. **Schedule Upload API**: Public endpoint for .xer, .xml, .mpp imports
2. **Activity CRUD Operations**: Create, read, update, delete activities
3. **Webhook Support**: Real-time notifications for schedule changes
4. **Bulk Operations**: Update multiple activities simultaneously

### Medium Priority Requests  
1. **Resource Management API**: Manage resources and assignments
2. **Baseline Comparison API**: Programmatic access to version comparison
3. **Critical Path API**: Access critical path calculations
4. **Calendar Management**: Manage project calendars and working days

### Integration Requests
1. **External System Sync**: Bidirectional sync with external project management tools
2. **Field Data Integration**: Push progress updates from field apps
3. **Automated Reporting**: Generate schedule reports programmatically

## Preparing for Schedule API

### Recommended Architecture Patterns
```javascript
class ScheduleService {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.scheduleCache = new Map();
  }

  // Placeholder for future implementation
  async getSchedule(projectId, scheduleId) {
    // Will be implemented when API becomes available
    throw new Error('Schedule API not yet available');
  }

  // Current workaround using Data Connector
  async getScheduleDataViaConnector(projectId) {
    return this.apiClient.post(`/construction/insights/v1/projects/${projectId}/queries`, {
      query: {
        from: "schedule_activities",
        select: ["*"],
        where: { "project_id": projectId }
      }
    });
  }

  // Link schedule context to other entities
  async createIssueWithScheduleContext(projectId, issueData, scheduleContext) {
    const enhancedIssue = {
      ...issueData,
      customAttributes: {
        ...issueData.customAttributes,
        "Schedule Activity": scheduleContext.activityName,
        "Schedule Impact": scheduleContext.impact,
        "Critical Path Affected": scheduleContext.criticalPath
      }
    };

    return this.apiClient.post(`/construction/issues/v1/projects/${projectId}/issues`, enhancedIssue);
  }
}
```

### MCP Server Tool Preparation
```javascript
// Prepare tool structure for future Schedule API
const scheduleTools = [
  {
    name: "get-schedule-activities",
    description: "Get schedule activities (will be available when API releases)",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        scheduleId: { type: "string" },
        dateRange: {
          type: "object",
          properties: {
            start: { type: "string", format: "date" },
            end: { type: "string", format: "date" }
          }
        },
        filters: {
          type: "object",
          properties: {
            status: { type: "array", items: { type: "string" } },
            criticalPath: { type: "boolean" },
            percentComplete: { type: "number" }
          }
        }
      },
      required: ["projectId"]
    }
  },
  {
    name: "update-activity-progress",
    description: "Update activity progress (will be available when API releases)",
    inputSchema: {
      type: "object", 
      properties: {
        projectId: { type: "string" },
        activityId: { type: "string" },
        percentComplete: { type: "number", minimum: 0, maximum: 100 },
        actualStartDate: { type: "string", format: "date-time" },
        actualEndDate: { type: "string", format: "date-time" },
        notes: { type: "string" }
      },
      required: ["projectId", "activityId", "percentComplete"]
    }
  }
];
```

## Key Takeaways

1. **Schedule API is Coming**: Autodesk has confirmed Schedule Integration API for Q2-Q3 2025
2. **Current Limitations**: No public API access to schedule data directly
3. **Workarounds Available**: Use Data Connector, References, and Cost Integration
4. **Web Interface is Rich**: Extensive scheduling, work planning, and comparison features exist
5. **Community Demand**: Strong developer community requesting schedule API access
6. **Prepare Now**: Design MCP server architecture to accommodate future Schedule API

## Monitoring for Updates

**Key Resources to Watch**:
- [Autodesk Platform Services Documentation](https://aps.autodesk.com/en/docs/acc/v1/overview/)
- [ACC Product Roadmap](https://construction.autodesk.com/products/product-roadmap/)
- [Developer Community Forums](https://forums.autodesk.com/t5/autodesk-construction-cloud/bd-p/240)

**Update Frequency**: Check quarterly for Schedule API releases and beta programs

The scheduling module represents one of the most requested API expansions, so it's likely to be a high-priority release when it becomes available.

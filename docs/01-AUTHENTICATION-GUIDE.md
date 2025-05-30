# OAuth Authentication Guide for ACC APIs

## Overview

Autodesk Construction Cloud APIs use OAuth 2.0 for authentication with two flows:
- **2-Legged OAuth**: App-level access (client credentials flow)  
- **3-Legged OAuth**: User-level access (authorization code flow)

## 2-Legged OAuth (Client Credentials)

**Use For:**
- Account administration (users, companies, projects)
- Project administration  
- Account-level data access
- Bulk operations not requiring user context

**Limitations:**
- Cannot access user-specific data
- Cannot access BIM 360 Team/Design Collaboration data
- Some endpoints require user context and will fail

**Token Endpoint:**
```
POST https://developer.api.autodesk.com/authentication/v2/token
```

**Request Body:**
```json
{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET", 
  "scope": "account:read account:write"
}
```

## 3-Legged OAuth (Authorization Code)

**Use For:**
- User-specific data access
- BIM 360 Team/Design Collaboration
- User impersonation scenarios
- Any operation requiring user consent

**Authorization URL:**
```
https://developer.api.autodesk.com/authentication/v2/authorize?
response_type=code&client_id=YOUR_CLIENT_ID&
redirect_uri=YOUR_CALLBACK_URL&scope=data:read data:write
```

**Token Exchange Request Body:**
```json
{
  "grant_type": "authorization_code",
  "client_id": "YOUR_CLIENT_ID", 
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
  "redirect_uri": "YOUR_CALLBACK_URL"
}
```

## Common Scopes for ACC

### Account & Admin Scopes
- `account:read` - Read account information
- `account:write` - Modify account settings
- `user-profile:read` - Read user profile information

### Data Management Scopes  
- `data:read` - Read files and folders
- `data:write` - Create/modify files and folders
- `data:create` - Create new data
- `data:search` - Search functionality

### Construction Cloud Specific
- `bucket:read` - Read bucket information
- `bucket:create` - Create buckets

## Token Management

### Token Response Structure
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def..." // 3-legged only
}
```

### Token Usage
Include in all API requests:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Refresh Tokens (3-Legged Only)
```json
{
  "grant_type": "refresh_token",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "refresh_token": "YOUR_REFRESH_TOKEN"
}
```

## Authentication Selection Guide

| Endpoint Category | Auth Type Required | Notes |
|-------------------|-------------------|-------|
| Account Users | 2-Legged | Admin access needed |
| Projects | 2-Legged | Account admin context |
| Files/Folders | 3-Legged | User context required |
| Issues | 3-Legged | User assignment needed |
| RFIs | 3-Legged | User-specific workflows |
| Submittals | 3-Legged | Review workflows |

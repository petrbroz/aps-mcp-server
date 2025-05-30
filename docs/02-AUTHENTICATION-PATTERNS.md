# Authentication Patterns and Troubleshooting

## Common Authentication Patterns

### Pattern 1: MCP Server with Mixed Auth Requirements
Many tools require both 2-legged and 3-legged tokens:

```javascript
class AuthManager {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.twoLeggedToken = null;
    this.threeLeggedToken = null;
  }
  
  async get2LeggedToken() {
    if (!this.twoLeggedToken || this.isTokenExpired(this.twoLeggedToken)) {
      this.twoLeggedToken = await this.fetch2LeggedToken();
    }
    return this.twoLeggedToken.access_token;
  }
  
  async get3LeggedToken() {
    // Implementation for 3-legged flow
    return this.threeLeggedToken?.access_token;
  }
}
```

### Pattern 2: Token Caching and Refresh
```javascript
async fetch2LeggedToken() {
  const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'account:read account:write data:read'
    })
  });
  
  const token = await response.json();
  token.expires_at = Date.now() + (token.expires_in * 1000);
  return token;
}
```

### Pattern 3: Error Handling with Retry Logic
```javascript
async makeAuthenticatedRequest(url, options = {}, retries = 3) {
  try {
    const token = await this.get2LeggedToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401 && retries > 0) {
      // Token expired, refresh and retry
      this.twoLeggedToken = null;
      return this.makeAuthenticatedRequest(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await this.delay(1000); // Wait 1 second
      return this.makeAuthenticatedRequest(url, options, retries - 1);
    }
    throw error;
  }
}
```

## Common Authentication Issues

### Issue 1: "Invalid Client" Error
**Cause**: Client ID/Secret mismatch or app not provisioned properly
**Solution**: 
- Verify credentials in Autodesk Developer Portal
- Ensure app is provisioned for target ACC account
- Check callback URL matches exactly

### Issue 2: "Insufficient Scope" Error  
**Cause**: Token doesn't have required permissions
**Solution**:
- Review endpoint documentation for required scopes
- Re-authenticate with broader scopes
- Check if endpoint requires 3-legged vs 2-legged auth

### Issue 3: 401 Unauthorized After Token Refresh
**Cause**: Cached token expired or invalid
**Solution**:
- Implement proper token expiration checking
- Clear token cache on 401 response
- Retry with fresh token

### Issue 4: "User Not Found" in 3-Legged Flow
**Cause**: User not member of target project/account
**Solution**:
- Verify user has proper project access
- Check user is active in target account
- Use 2-legged flow for admin operations

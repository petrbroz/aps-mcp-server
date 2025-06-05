# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build the TypeScript project
npm run build

# Watch mode during development
npm run dev

# Test the MCP server with inspector
npm run inspect

# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run working tests (integration style)
npm run test:working

# Lint and format code
npm run lint
npm run lint:fix
npm run format

# Validate entire codebase
npm run validate
```

## Architecture Overview

This is an MCP (Model Context Protocol) server for Autodesk Construction Cloud (ACC) integration with a **dual authentication architecture**:

### Service Account Authentication (Automated)
- **Location**: `src/auth.ts` - `getServiceAccountAccessToken()`
- **Usage**: Automated access for projects, files, issues, diagnostics
- **Tools**: All tools in `src/tools/` except forms and RFIs
- **Token**: Uses JWT assertion with service account credentials

### OAuth Authentication (User-Accountable)
- **Location**: `src/utils/oauth.ts` - `authenticateWithOAuth()`
- **Usage**: User-based access for sensitive construction operations requiring audit trails
- **Tools**: `get-forms.ts`, `get-rfis.ts` (submittals API not available)
- **Flow**: Browser-based OAuth 2.0 with intelligent token management
- **Features**: 
  - **Smart Caching**: First authentication opens browser, subsequent calls use cached tokens
  - **Auto-Refresh**: Expired tokens refresh automatically (no browser popup)
  - **Fallback**: Refresh failures trigger new authentication flow
  - **Security**: 5-minute safety buffer on token expiration

### Tool Structure
- **Entry Point**: `src/server.ts` loads tools from `src/tools/index.ts`
- **Common Utilities**: `src/tools/common.ts` for service account authentication
- **OAuth Utilities**: `src/utils/oauth.ts` for user authentication
- **Tool Pattern**: Each tool exports `{ title, description, schema, callback }`

### Configuration
- **Environment**: All config loaded via `src/config.ts`
- **Required Variables**: Service account credentials + OAuth app credentials
- **Two APS Apps Required**:
  - **Server-to-Server App**: For service account authentication (automated tools)
  - **Web Application App**: For OAuth authentication (user-accountable tools)
  - **OAuth Callback URL**: Must be configured as `http://localhost:8765/oauth/callback`

## Key Development Patterns

### Adding Service Account Tools
Use the established pattern from existing tools:
```typescript
import { getAccessToken } from "./common.js";
// Tool uses service account authentication automatically
```

### Adding OAuth Tools
Follow the pattern from `get-forms.ts`, `get-rfis.ts`:
```typescript
import { authenticateWithOAuth } from "../utils/oauth.js";

// In your tool callback:
const tokens = await authenticateWithOAuth();
const accessToken = tokens.access_token;

// Use accessToken in API calls for user-accountable operations
```

### API Limitations
- **Submittals API**: Not available for ACC projects - Autodesk has not implemented this API
- **Alternative**: Use Forms API for submittal approval workflows or manual document management

### OAuth User Experience
- **First Use**: Browser opens automatically for Autodesk login
- **Subsequent Uses**: Silent authentication using cached tokens
- **Token Expiry**: Auto-refresh happens transparently
- **Refresh Failure**: Browser reopens only when necessary
- **Session Length**: Tokens typically valid for 1 hour, refresh tokens longer-lived

### Testing
- `src/tests/unit/` - Unit tests for individual tools
- `src/tests/working-*.js` - Integration tests with real API calls
- Run `npm run build` before testing (tests run against compiled JS)

### MCP Server Testing
- Use `npm run inspect` to test tools interactively
- Browser opens at http://localhost:5173 for tool testing
- Essential for validating OAuth flows and authentication
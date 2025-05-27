# ACC-MCP Server Issues & Status

## 🔴 Critical Issues (Blocks Core Functionality)

### None Currently

---

## 🟡 High Priority Issues (Impacts User Experience)

### Issue #1: "No Data" Returns from Working Tools
- **Status**: 🔍 ROOT CAUSE IDENTIFIED
- **Symptoms**: Tools execute without error but return empty results
- **Affected Tools**: get-issues, get-folder-contents, get-issue-types
- **Priority**: High
- **Root Cause**: **Folder/Files API specifically failing with "Invalid project id"**
- **Key Finding**: Project ID is valid (works with Projects, Issues, Accounts APIs)
- **Systematic Test Results**:
  - ✅ Accounts API: Working
  - ✅ Projects API: Working  
  - ✅ Issues API: Working (0 issues found - project is empty)
  - ❌ Folders API: **FAILING** - "Invalid project id" error
- **Next Action**: Deep diagnostic of folder API call vs working APIs
- **Assigned**: Current session

### Issue #2: Parameter Mismatch Errors 
- **Status**: ❌ FIX UNSUCCESSFUL (underlying folder API issue)
- **Symptoms**: "Invalid project id" errors
- **Root Cause**: **NOT parameter mismatch - Folder API itself is failing**
- **Discovery**: Auto-resolve accountId logic works, but folder API still fails
- **Tools Affected**: get-project-files, get-project-summary
- **Systematic Test Results**: Both tools still fail with same error
- **Real Issue**: Same as Issue #1 - Folder API problem
- **Next Action**: Merge with Issue #1 investigation

---

## 🟢 Medium Priority Issues (Feature Improvements)

### Issue #3: Forms/RFI API Integration
- **Status**: 🔴 Blocked - Technical Limitation
- **Root Cause**: Requires 3-legged OAuth (user login)
- **Current Auth**: 2-legged OAuth (Service Accounts)
- **Decision**: Postpone until core functionality stable
- **Alternative**: Document limitation and provide workaround suggestions

### Issue #4: Error Handling Inconsistency
- **Status**: 🟡 Needs Improvement
- **Issue**: Different tools handle errors differently
- **Impact**: Inconsistent user experience
- **Solution**: Standardize error response format across all tools
- **Priority**: Medium

---

## 🔵 Low Priority Issues (Code Quality)

### Issue #5: TypeScript Strictness
- **Status**: 🟡 In Progress
- **Issue**: Some tools use `any` types, loose error handling
- **Solution**: Implement stricter TypeScript configuration
- **Progress**: ESLint configuration added

### Issue #6: Documentation Gaps
- **Status**: 🔵 Planned
- **Issue**: Missing comprehensive API documentation
- **Solution**: Create detailed documentation for each tool
- **Timeline**: After core functionality stable

---

## ✅ Resolved Issues

### Issue #7: Environment Variable Loading (RESOLVED)
- **Status**: ✅ RESOLVED
- **Issue**: Claude Desktop couldn't load .env file
- **Root Cause**: Wrong path resolution for .env file
- **Solution**: 
  1. Fixed path resolution in config.ts
  2. Added direct env vars to Claude Desktop config
- **Resolution Date**: Current session

### Issue #8: TypeScript Compilation Errors (RESOLVED)
- **Status**: ✅ RESOLVED  
- **Issue**: Multiple TypeScript errors preventing build
- **Root Cause**: Missing type definitions, improper type assertions
- **Solution**: Added proper interfaces and type assertions
- **Resolution Date**: Current session

---

## 📊 Current System Status

### ✅ Working Components:
- Authentication (Service Accounts)
- Basic project/account access
- Issue root causes retrieval
- Build system (TypeScript compilation)
- Claude Desktop integration

### 🔍 Under Investigation:
- Data retrieval from project APIs
- Service account permissions scope
- Project data availability

### ❌ Known Limitations:
- Forms API (requires 3-legged OAuth)
- RFI API (requires 3-legged OAuth)
- Drawing sheet processing (not yet attempted)

---

## 🎯 Next Actions (Prioritized)

1. **[HIGH]** Run diagnostic tool to identify data availability issues
2. **[HIGH]** Test fixed parameter resolution in project tools
3. **[MEDIUM]** Standardize error handling across all tools
4. **[MEDIUM]** Add comprehensive testing for working tools
5. **[LOW]** Improve documentation and code quality

---

## 📋 Testing Checklist

### Tools to Test Systematically:
- [ ] get-accounts (✅ Known working)
- [ ] get-projects (✅ Known working) 
- [ ] get-issue-root-causes (✅ Known working)
- [ ] get-project-files (🔍 Fixed, needs testing)
- [ ] get-project-summary (🔍 Fixed, needs testing)
- [ ] get-project-diagnostics (🆕 New tool, needs testing)
- [ ] get-issues (❓ Returns no data, investigate)
- [ ] get-folder-contents (❓ Returns no data, investigate)
- [ ] get-issue-types (❓ Returns no data, investigate)

### Testing Method:
1. **MCP Inspector Testing** - Verify tool execution
2. **Claude Desktop Testing** - Verify integration
3. **Error Case Testing** - Verify error handling
4. **Edge Case Testing** - Invalid parameters, etc.

---

*Last Updated: Current Session*
*Next Review: After diagnostic testing*
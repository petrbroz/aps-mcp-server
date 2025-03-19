# TODO

## Authentication

Currently there's a [draft proposal](https://spec.modelcontextprotocol.io/specification/draft/basic/authorization/#22-basic-oauth-21-authorization) for adding OAuth 2.0 to Model Context Protocol. For now we'll use Secure Service Accounts.

## Fetch

For some reason, Claude Desktop is not able to use this server when it uses the built-in [fetch](https://nodejs.org/dist/latest-v22.x/docs/api/globals.html#fetch) method, perhaps because it's using an older version of Node.js. For now we're using the [node-fetch](https://www.npmjs.com/package/node-fetch) NPM module.
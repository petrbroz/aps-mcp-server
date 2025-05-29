import fetch from "node-fetch";
import jwt from "jsonwebtoken";

interface Credentials {
    access_token: string;
    token_type: string;
    expires_in: number;
}

/**
 * Generates an access token for APS using specific grant type.
 *
 * @param clientId The client ID provided by Autodesk.
 * @param clientSecret The client secret provided by Autodesk.
 * @param grantType The grant type for the access token.
 * @param scopes An array of scopes for which the token is requested.
 * @param assertion The JWT assertion for the access token.
 * @returns A promise that resolves to the access token response object.
 * @throws If the request for the access token fails.
 */
async function getAccessToken(clientId: string, clientSecret: string, grantType: string, scopes: string[], assertion?: string): Promise<Credentials> {
    const headers = {
        "Accept": "application/json",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
    };
    const body = new URLSearchParams({
        "grant_type": grantType,
        "scope": scopes.join(" ")
    });
    if (assertion) {
        body.append("assertion", assertion);
    }
    const response = await fetch("https://developer.api.autodesk.com/authentication/v2/token", { method: "POST", headers, body });
    if (!response.ok) {
        throw new Error(`Could not generate access token: ${await response.text()}`);
    }
    const credentials = await response.json() as Credentials;
    return credentials;
}

/**
 * Creates a JWT assertion for OAuth 2.0 authentication.
 *
 * @param clientId The client ID of the application.
 * @param serviceAccountId The service account ID.
 * @param serviceAccountKeyId The key ID of the service account.
 * @param serviceAccountPrivateKey The private key of the service account.
 * @param scopes The scopes for the access token.
 * @returns The signed JWT assertion.
 */
function createAssertion(clientId: string, serviceAccountId: string, serviceAccountKeyId: string, serviceAccountPrivateKey: string, scopes: string[]) {
    // TODO: validate inputs
    const payload = {
        iss: clientId,
        sub: serviceAccountId,
        aud: "https://developer.api.autodesk.com/authentication/v2/token",
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        scope: scopes
    };
    const options = {
        algorithm: "RS256" as jwt.Algorithm,
        header: { alg: "RS256", kid: serviceAccountKeyId }
    };
    return jwt.sign(payload, serviceAccountPrivateKey, options);
}

/**
 * Generates an access token for APS using client credentials ("two-legged") flow.
 *
 * @param clientId The client ID provided by Autodesk.
 * @param clientSecret The client secret provided by Autodesk.
 * @param scopes An array of scopes for which the token is requested.
 * @returns A promise that resolves to the access token response object.
 * @throws If the request for the access token fails.
 */
export async function getClientCredentialsAccessToken(clientId: string, clientSecret: string, scopes: string[]) {
    return getAccessToken(clientId, clientSecret, "client_credentials", scopes);
}

/**
 * Retrieves an access token for a service account using client credentials and JWT assertion.
 *
 * @param clientId The client ID for the OAuth application.
 * @param clientSecret The client secret for the OAuth application.
 * @param serviceAccountId The ID of the service account.
 * @param serviceAccountKeyId The key ID of the service account.
 * @param serviceAccountPrivateKey The private key of the service account.
 * @param scopes An array of scopes for the access token.
 * @returns A promise that resolves to the access token response object.
 * @throws If the access token could not be retrieved.
 */
export async function getServiceAccountAccessToken(clientId: string, clientSecret: string, serviceAccountId: string, serviceAccountKeyId: string, serviceAccountPrivateKey: string, scopes: string[]) {
    const assertion = createAssertion(clientId, serviceAccountId, serviceAccountKeyId, serviceAccountPrivateKey, scopes);
    return getAccessToken(clientId, clientSecret, "urn:ietf:params:oauth:grant-type:jwt-bearer", scopes, assertion);
}

/**
 * Creates a new service account with the given name.
 *
 * @param name The name of the service account to create (must be between 5 and 64 characters long).
 * @param firstName The first name of the service account.
 * @param lastName The last name of the service account.
 * @param accessToken The access token for authentication.
 * @returns A promise that resolves to the created service account response.
 * @throws If the request to create the service account fails.
 */
export async function createServiceAccount(name: string, firstName: string, lastName: string, accessToken: string) {
    const headers = {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };
    const body = JSON.stringify({ name, firstName, lastName });
    const response = await fetch("https://developer.api.autodesk.com/authentication/v2/service-accounts", { method: "POST", headers, body });
    if (!response.ok) {
        throw new Error(`Could not create service account: ${await response.text()}`);
    }
    return response.json();
}

/**
 * Creates a private key for a given service account.
 *
 * @param serviceAccountId - The ID of the service account for which to create a private key.
 * @param accessToken - The access token used for authorization.
 * @returns A promise that resolves to the private key details.
 * @throws If the request to create the private key fails.
 */
export async function createServiceAccountPrivateKey(serviceAccountId: string, accessToken: string) {
    const headers = {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`
    };
    const response = await fetch(`https://developer.api.autodesk.com/authentication/v2/service-accounts/${serviceAccountId}/keys`, { method: "POST", headers });
    if (!response.ok) {
        throw new Error(`Could not create service account private key: ${await response.text()}`);
    }
    return response.json();
}
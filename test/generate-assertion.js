import fs from "node:fs/promises";
import jwt from "jsonwebtoken";
import { APS_CLIENT_ID, APS_SA_ID, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY } from "../build/config.js";

const LOG_FILE = "generate-assertion.log";
async function log(message, data) {
    const logEntry = { timestamp: new Date().toISOString(), message, data };
    await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + "\n");
}

async function generateAssertion() {
    const payload = {
        iss: APS_CLIENT_ID,
        sub: APS_SA_ID,
        aud: "https://developer.api.autodesk.com/authentication/v2/token",
        exp: 1758721100, // Math.floor(Date.now() / 1000) + 300, // 5 minutes
        scope: "data:read"
    };
    const options = {
        algorithm: "RS256",
        header: { alg: "RS256", kid: APS_SA_KEY_ID }
    };
    await log("Generating assertion", { payload, options, privateKey: APS_SA_PRIVATE_KEY });
    return jwt.sign(payload, APS_SA_PRIVATE_KEY, options);
}

generateAssertion()
    .then((assertion) => {
        return log("Generated assertion", { assertion });
    })
    .catch((err) => {
        console.error("Error generating assertion:", err);
        process.exit(1);
    });
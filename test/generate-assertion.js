import jwt from "jsonwebtoken";
import { APS_CLIENT_ID, APS_SA_ID, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY } from "../build/config.js";

async function generateAssertion() {
    const payload = {
        iss: APS_CLIENT_ID,
        sub: APS_SA_ID,
        aud: "https://developer.api.autodesk.com/authentication/v2/token",
        exp: 1758720617, // Math.floor(Date.now() / 1000) + 300, // 5 minutes
        scope: "data:read"
    };
    const options = {
        algorithm: "RS256",
        header: { alg: "RS256", kid: APS_SA_KEY_ID }
    };
    console.log({ payload, options, privateKey: APS_SA_PRIVATE_KEY });
    return jwt.sign(payload, APS_SA_PRIVATE_KEY, options);
}

console.log("APS_CLIENT_ID:", APS_CLIENT_ID);
generateAssertion()
    .then((assertion) => {
        console.log({ assertion });
    })
    .catch((err) => {
        console.error("Error generating assertion:", err);
        process.exit(1);
    });
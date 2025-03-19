import url from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_EMAIL, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY } = dotenv.config({ path: path.join(__dirname, "..", ".env") }).parsed!;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_SA_ID || !APS_SA_EMAIL || !APS_SA_KEY_ID || !APS_SA_PRIVATE_KEY) {
    console.error("Missing one or more required environment variables: APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_EMAIL, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY");
    process.exit(1);
}

export {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_SA_ID,
    APS_SA_EMAIL,
    APS_SA_KEY_ID,
    APS_SA_PRIVATE_KEY
}
import path from "node:path";
import url from "node:url";
import dotenv from "dotenv";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SA_ID, APS_SA_EMAIL, APS_SA_KEY_ID, APS_SA_PRIVATE_KEY } = process.env;

export {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_SA_ID,
    APS_SA_EMAIL,
    APS_SA_KEY_ID,
    APS_SA_PRIVATE_KEY
}
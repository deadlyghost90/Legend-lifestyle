// Run only on a trusted computer. Never commit the service-account JSON file.
// PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\service-account.json'
// Then: node scripts/set-admin-claim.mjs admin@example.com
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
if (process.argv.length !== 3 || !process.argv[2].includes("@")) { console.error("Usage: node scripts/set-admin-claim.mjs <admin-email>"); process.exit(1); }
initializeApp({ credential: applicationDefault(), projectId: "aera-s-store" });
const auth = getAuth();
const user = await auth.getUserByEmail(process.argv[2]);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
console.log("Admin claim set for " + user.email + ". Sign out and sign in again to refresh the token.");
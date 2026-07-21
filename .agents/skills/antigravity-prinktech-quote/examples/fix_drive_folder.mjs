import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim().replace(/^["']|["']$/g, '');
        process.env[match[1]] = val;
      }
    });
  }
}
loadEnv();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost');
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

async function fixDriveFolder() {
  const folderId = '14VxDz-12vL3jtnL702ZKpgOpfhRqLYxc';
  const newName = '5. Nguyễn Đức Nghĩa - 0334626393';
  await drive.files.update({
    fileId: folderId,
    requestBody: { name: newName }
  });
  console.log(`Renamed Drive folder ${folderId} to "${newName}"`);
}
fixDriveFolder().catch(console.error);

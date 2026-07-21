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
const PARENT_DRIVE_FOLDER_ID = '1HKqBw0DKnmQvcXzyjo9cgtrFl15Ehj24';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost');
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

async function listFolders() {
  const res = await drive.files.list({
    q: `'${PARENT_DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'name'
  });
  console.log('Google Drive Folders:');
  console.log(JSON.stringify(res.data.files, null, 2));
}
listFolders();

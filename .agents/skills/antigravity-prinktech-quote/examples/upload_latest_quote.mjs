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
const folderId = '14VxDz-12vL3jtnL702ZKpgOpfhRqLYxc';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost');
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

async function uploadLatestFiles() {
  const localDir = path.resolve('bao_gia/5. Nguyen_Duc_Nghia_C_0334626393');
  const files = fs.readdirSync(localDir);

  for (const file of files) {
    if (!file.endsWith('.xlsx') && !file.endsWith('.pdf')) continue;
    const filePath = path.join(localDir, file);
    let mime = file.endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      : 'application/pdf';

    const existCheck = await drive.files.list({
      q: `'${folderId}' in parents and name = '${file}' and trashed = false`,
      fields: 'files(id, name)',
    });

    if (existCheck.data.files && existCheck.data.files.length > 0) {
      const fId = existCheck.data.files[0].id;
      console.log(`Updating file content on Drive: ${file} (ID: ${fId})`);
      await drive.files.update({
        fileId: fId,
        media: { mimeType: mime, body: fs.createReadStream(filePath) }
      });
    } else {
      console.log(`Uploading new file: ${file}`);
      await drive.files.create({
        requestBody: { name: file, parents: [folderId] },
        media: { mimeType: mime, body: fs.createReadStream(filePath) }
      });
    }
  }
  console.log('Successfully updated Google Drive quote files!');
}
uploadLatestFiles().catch(console.error);

// ---------------- CONFIG ----------------
const { google } = require('googleapis');
const fs = require('fs');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');

const OWNER = 'hntwaifu';              // your GitHub username
const REPO = 'HNTWaifu';               // EXACT repo name (case matters)
const BRANCH = 'main';

const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';

const BASE_FOLDER = 'images/category';

// ---------------------------------------

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync('service-account.json', 'utf8')),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

async function run() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Form Responses 1!A:C',
  });

  const rows = res.data.values.slice(1);
  if (!rows.length) {
    console.log('No new rows');
    return;
  }

  let dataJson = [];

  for (const [title, category, imageUrl] of rows) {
    if (!title || !category || !imageUrl) continue;

    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const safeCategory = category.toLowerCase().replace(/\s+/g, '-');

    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.buffer();

    const path = `${BASE_FOLDER}/${safeCategory}/${safeTitle}.jpg`;

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Add image: ${title}`,
      content: buffer.toString('base64'),
      branch: BRANCH,
    });

    dataJson.push({
      title,
      category,
      file: path
    });

    console.log(`Uploaded: ${title}`);
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: 'images/data.json',
    message: 'Update data.json',
    content: Buffer.from(JSON.stringify(dataJson, null, 2)).toString('base64'),
    branch: BRANCH,
  });

  console.log('data.json updated');
}

run().catch(console.error);

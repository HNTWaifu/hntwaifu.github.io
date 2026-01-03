// ---------------- CONFIG ----------------
import { google } from 'googleapis';
import fs from 'fs';
import fetch from 'node-fetch';
import { Octokit } from '@octokit/rest';

// GitHub repo info
const OWNER = 'hntwaifu';        // your GitHub username
const REPO = 'HNTWaifu';         // EXACT repo name (case matters)
const BRANCH = 'main';

// Google Sheet ID from your form responses
const SHEET_ID = '1abcDxyzEFGhiJKlmNOPqRSTuvWXyZ1234567890';  // <-- REPLACE with your real Sheet ID

// Folder structure in repo
const BASE_FOLDER = 'images/category';

// GitHub API client using secret token
const octokit = new Octokit({
  auth: process.env.UPLOAD_TOKEN
});

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync('service-account.json', 'utf8')),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

async function run() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 1️⃣ Get data from Google Sheet
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Form Responses 1!A:C', // Title | Category | Image URL
  });

  const rows = res.data.values.slice(1); // skip header
  if (!rows.length) {
    console.log('No new rows');
    return;
  }

  let dataJson = [];

  for (const [title, category, imageUrl] of rows) {
    if (!title || !category || !imageUrl) continue;

    // make filenames safe
    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const safeCategory = category.toLowerCase().replace(/\s+/g, '-');

    // 2️⃣ Download image
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // 3️⃣ Commit image to GitHub
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

  // 4️⃣ Update data.json
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: 'images/data.json',
    message: 'Update data.json',
    content: Buffer.from(JSON.stringify(dataJson, null, 2)).toString('base64'),
    branch: BRANCH,
  });

  console.log('data.json updated ✅');
}

// Run the script
run().catch(console.error);

// ----------------- CONFIG -----------------
const { google } = require('googleapis');
const fs = require('fs');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');

const GITHUB_REPO = 'hntwaifu/HNTWaifu'; // e.g., hntwaifu/HNTWaifu
const GITHUB_BRANCH = 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // set in GitHub Actions
const SHEET_ID = '1qVguCC4gSkIjHpuuGPpO_AaxJoxz0irrJxyJBXGSTRU'; // from Google Sheets URL
const CATEGORY_FOLDER = 'images/category'; // bucket folder
// ------------------------------------------

// Google Sheets setup
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

// Octokit setup
const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function main() {
  // 1️⃣ Get data from Google Sheet
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId: SHEET_ID,
    range: 'Form Responses 1!A:C' // Title | Category | Image URL
  });

  const rows = res.data.values.slice(1); // skip header
  for (const [title, category, imageUrl] of rows) {
    if (!title || !category || !imageUrl) continue;

    // 2️⃣ Download image
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    // 3️⃣ Commit image to GitHub
    const path = `${CATEGORY_FOLDER}/${category.toLowerCase()}/${title.replace(/\s/g, '-')}.jpg`;

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO.split('/')[0],
      repo: GITHUB_REPO.split('/')[1],
      path,
      message: `Add image: ${title}`,
      content: Buffer.from(buffer).toString('base64'),
      branch: GITHUB_BRANCH
    });

    console.log(`Uploaded ${title} to ${category}`);
  }

  // 4️⃣ Update data.json
  let dataJson = [];
  for (const [title, category, imageUrl] of rows) {
    const publicUrl = `images/category/${category.toLowerCase()}/${title.replace(/\s/g, '-')}.jpg`;
    dataJson.push({ file: publicUrl, title, category });
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_REPO.split('/')[0],
    repo: GITHUB_REPO.split('/')[1],
    path: 'images/data.json',
    message: 'Update data.json',
    content: Buffer.from(JSON.stringify(dataJson, null, 2)).toString('base64'),
    branch: GITHUB_BRANCH
  });

  console.log('data.json updated ✅');
}

main().catch(console.error);

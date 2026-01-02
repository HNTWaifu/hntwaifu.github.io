name: Upload Images from Google Form

on:
  workflow_dispatch: # manual run
  schedule:
    - cron: '*/5 * * * *' # runs every 5 minutes

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install googleapis node-fetch @octokit/rest

      - name: Run upload script
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/upload-from-form.js

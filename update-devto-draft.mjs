#!/usr/bin/env node
// Update an existing Dev.to draft's body in place (does not change published state).
//
// Usage:
//   node update-devto-draft.mjs <articleId> <markdown-file>
//
// Env: DEVTO_API_KEY required.

import { readFile } from "node:fs/promises";

async function main() {
  const [articleId, filePath] = process.argv.slice(2);
  if (!articleId || !filePath) {
    console.error("Usage: node update-devto-draft.mjs <articleId> <markdown-file>");
    process.exit(1);
  }

  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.error("Missing DEVTO_API_KEY environment variable.");
    process.exit(1);
  }

  const bodyMarkdown = await readFile(filePath, "utf-8");

  const res = await fetch(`https://dev.to/api/articles/${articleId}`, {
    method: "PUT",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/vnd.forem.api-v1+json",
    },
    body: JSON.stringify({ article: { body_markdown: bodyMarkdown } }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`Dev.to API error (${res.status}):`, JSON.stringify(data));
    process.exit(1);
  }

  console.log("Updated:", data.url, "published:", data.published);
}

main();

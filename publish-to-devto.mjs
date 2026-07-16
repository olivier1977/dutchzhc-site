#!/usr/bin/env node
// Publish (or draft) a markdown blog post to Dev.to via the Forem v1 API.
//
// Usage:
//   node publish-to-devto.mjs <markdown-file> --title "Post title" [--tags tag1,tag2] \
//     [--canonical-url https://dzhc.example/blog/post] [--publish]
//
// Env:
//   DEVTO_API_KEY   required — personal API key from https://dev.to/settings/extensions
//   DEVTO_ORG_ID    optional — numeric organization id to post under DZHC's org page
//                   instead of the API key owner's personal profile
//
// Defaults to published:false (draft) unless --publish is passed, so a bad
// run never goes live silently.

import { readFile } from "node:fs/promises";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--publish") args.publish = true;
    else if (a === "--title") args.title = argv[++i];
    else if (a === "--tags") args.tags = argv[++i];
    else if (a === "--canonical-url") args.canonicalUrl = argv[++i];
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args._[0];
  if (!filePath || !args.title) {
    console.error(
      "Usage: node publish-to-devto.mjs <markdown-file> --title \"...\" [--tags a,b] [--canonical-url URL] [--publish]"
    );
    process.exit(1);
  }

  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.error("Missing DEVTO_API_KEY environment variable.");
    process.exit(1);
  }

  const bodyMarkdown = await readFile(filePath, "utf-8");

  const article = {
    title: args.title,
    body_markdown: bodyMarkdown,
    published: Boolean(args.publish),
  };
  if (args.tags) {
    article.tags = args.tags.split(",").map((t) => t.trim()).slice(0, 4);
  }
  if (args.canonicalUrl) article.canonical_url = args.canonicalUrl;
  if (process.env.DEVTO_ORG_ID) {
    article.organization_id = Number(process.env.DEVTO_ORG_ID);
  }

  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/vnd.forem.api-v1+json",
    },
    body: JSON.stringify({ article }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`Dev.to API error (${res.status}):`, JSON.stringify(data));
    process.exit(1);
  }

  console.log(article.published ? "Published:" : "Saved as draft:", data.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

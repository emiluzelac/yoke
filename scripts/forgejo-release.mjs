#!/usr/bin/env node
// node scripts/forgejo-release.mjs <tag> <notes.md> <asset>... [--dry-run]
//
// Creates (or finds) the Forgejo release of <tag>, with the notes as its body, and
// attaches each asset that it does not have yet, so running it twice is harmless.
// --dry-run creates a draft release instead and deletes it again, to prove the token
// may write releases. Used by .forgejo/workflows/release.yml; FORGEJO_API is
// `<server>/api/v1/repos/<owner>/<repo>` and FORGEJO_TOKEN the job's token.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [tag, notesFile, ...assets] = args.filter((a) => a !== "--dry-run");
const api = process.env.FORGEJO_API;
const token = process.env.FORGEJO_TOKEN;
const die = (m) => { console.error(`forgejo-release: ${m}`); process.exit(1); };
if (!tag || !notesFile || !api || !token) die("usage: FORGEJO_API=… FORGEJO_TOKEN=… forgejo-release.mjs <tag> <notes.md> <asset>... [--dry-run]");

const headers = { Authorization: `token ${token}`, Accept: "application/json" };
async function call(method, path, body) {
  const init = { method, headers: { ...headers } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["Content-Type"] = "application/json"; }
  const res = await fetch(`${api}${path}`, init);
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

const notes = readFileSync(notesFile, "utf8");
if (dryRun) {
  const made = await call("POST", "/releases", { tag_name: tag, name: `${tag} (dry run, deleted at once)`, body: notes, draft: true });
  if (made.status !== 201) die(`creating a draft release answered ${made.status}: ${JSON.stringify(made.json)}`);
  const gone = await call("DELETE", `/releases/${made.json.id}`);
  if (gone.status !== 204) die(`deleting draft release ${made.json.id} answered ${gone.status}; delete it by hand`);
  console.log(`dry run: the token may write releases (draft ${made.json.id} created and deleted); ${assets.length} asset(s) would be attached`);
  process.exit(0);
}

let rel = await call("GET", `/releases/tags/${encodeURIComponent(tag)}`);
if (rel.status === 404) {
  rel = await call("POST", "/releases", { tag_name: tag, name: tag, body: notes, draft: false, prerelease: false });
  if (rel.status !== 201) die(`creating the release answered ${rel.status}: ${JSON.stringify(rel.json)}`);
  console.log(`created release ${tag}`);
} else if (rel.status !== 200) {
  die(`reading the release answered ${rel.status}`);
} else {
  console.log(`release ${tag} exists`);
}
const have = new Set((rel.json.assets || []).map((a) => a.name));
for (const file of assets) {
  const name = basename(file);
  if (have.has(name)) { console.log(`${name} is attached already`); continue; }
  const form = new FormData();
  form.append("attachment", new Blob([readFileSync(file)]), name);
  const up = await call("POST", `/releases/${rel.json.id}/assets?name=${encodeURIComponent(name)}`, form);
  if (up.status !== 201) die(`attaching ${name} answered ${up.status}: ${JSON.stringify(up.json)}`);
  console.log(`attached ${name}`);
}
console.log(rel.json.html_url || "");

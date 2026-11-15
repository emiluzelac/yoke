#!/usr/bin/env node
// Cut a Yoke release: node scripts/release.mjs <version> [--dry-run] [--skip-ci-check]
//
// Since 2026-11-15 Yoke's canonical repository is emiluzelac/yoke on our own (private)
// Forgejo, which mirrors every push to github.com/emiluzelac/yoke. Run this in a clone
// whose `origin` is that Forgejo.
// release-please merged its release PRs on GitHub, which the mirror would overwrite, so
// this script does its job on Forgejo instead: it writes the CHANGELOG.md section from
// the conventional commits since the last tag (release-please's sections and format),
// sets the version in package.json and package-lock.json, commits
// "chore(main): release <version>", tags v<version> and pushes both to Forgejo, where the
// tag runs .forgejo/workflows/release.yml: it publishes the VSIX to the VS Code
// Marketplace (and Open VSX when that token is set) and creates the Forgejo release with
// this section as its notes. The mirror carries the commit and the tag to GitHub.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

const REPO_URL = "https://github.com/emiluzelac/yoke";
const SECTIONS = [
  ["feat", "Features"], ["fix", "Bug Fixes"], ["perf", "Performance Improvements"],
  ["deps", "Dependencies"], ["revert", "Reverts"], ["docs", "Documentation"],
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipCi = args.includes("--skip-ci-check");
const version = args.find((a) => !a.startsWith("--"));
const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
const die = (m) => { console.error(`release: ${m}`); process.exit(1); };

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) die("usage: node scripts/release.mjs <major.minor.patch> [--dry-run] [--skip-ci-check]");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cmp = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
if (cmp(version, pkg.version) <= 0) die(`${version} is not newer than package.json's ${pkg.version}`);

if (git("rev-parse", "--abbrev-ref", "HEAD") !== "main") die("check out main first");
if (git("status", "--porcelain")) die("the working tree has changes; commit or stash them");
git("fetch", "-q", "--tags", "origin");
const head = git("rev-parse", "HEAD");
if (head !== git("rev-parse", "origin/main")) die("main is not origin/main (Forgejo); pull or push first");
if (git("tag", "-l", `v${version}`)) die(`tag v${version} exists already`);

if (!skipCi) {
  // Forgejo's web and API answer on port 3000 of the host `origin` names (ssh on 2222).
  const host = /^(?:ssh:\/\/)?(?:[^@]+@)?([^:/]+)/.exec(git("remote", "get-url", "origin").replace(/^https?:\/\//, ""))?.[1];
  const api = process.env.FORGEJO_API || `http://${host}:3000/api/v1/repos/emiluzelac/yoke`;
  const tokenFile = `${homedir()}/.config/forgejo/token`;
  const token = process.env.FORGEJO_TOKEN || (existsSync(tokenFile) ? readFileSync(tokenFile, "utf8").trim() : "");
  if (!token) die("no Forgejo token (FORGEJO_TOKEN or ~/.config/forgejo/token) to check CI; pass --skip-ci-check after checking the run yourself");
  const res = await fetch(`${api}/actions/runs?limit=50`, { headers: { Authorization: `token ${token}` } });
  if (!res.ok) die(`Forgejo answered ${res.status} for the CI runs`);
  // Forgejo names a run's commit `commit_sha` (its `head_sha` is empty).
  const run = ((await res.json()).workflow_runs || []).find((r) => (r.commit_sha || r.head_sha) === head && r.event === "push" && r.workflow_id === "ci.yml");
  if (!run) die(`no CI run for ${head.slice(0, 8)} on main yet; wait for it`);
  if (run.status !== "success") die(`CI for ${head.slice(0, 8)} is ${run.status}; release only a green main`);
}

const previous = git("describe", "--tags", "--abbrev=0", "--match", "v*");
const log = git("log", `${previous}..HEAD`, "--format=%H%x09%s");
const entries = Object.fromEntries(SECTIONS.map(([t]) => [t, []]));
for (const line of log ? log.split("\n") : []) {
  const [sha, subject] = line.split("\t");
  const m = /^(\w+)(?:\(([^)]+)\))?!?: (.+)$/.exec(subject);
  if (!m || !(m[1] in entries)) continue;
  const scope = m[2] ? `**${m[2]}:** ` : "";
  entries[m[1]].push(`* ${scope}${m[3]} ([${sha.slice(0, 7)}](${REPO_URL}/commit/${sha}))`);
}
const date = new Date().toISOString().slice(0, 10);
let section = `## [${version}](${REPO_URL}/compare/${previous}...v${version}) (${date})\n`;
for (const [type, title] of SECTIONS) if (entries[type].length) section += `\n\n### ${title}\n\n${entries[type].join("\n")}\n`;
if (!SECTIONS.some(([t]) => entries[t].length)) section += "\n\nNo user-facing changes.\n";

console.log(section);
if (dryRun) { console.log("(dry run: nothing written)"); process.exit(0); }

const changelog = readFileSync("CHANGELOG.md", "utf8");
const marker = "# Changelog\n\n";
if (!changelog.startsWith(marker)) die("CHANGELOG.md does not start with '# Changelog'");
writeFileSync("CHANGELOG.md", marker + section + "\n" + changelog.slice(marker.length));
execFileSync("npm", ["version", version, "--no-git-tag-version"], { stdio: "inherit" });
git("add", "CHANGELOG.md", "package.json", "package-lock.json");
git("commit", "-q", "-m", `chore(main): release ${version}`);
git("tag", "-a", `v${version}`, "-m", `v${version}`);
execFileSync("git", ["push", "origin", "main", `v${version}`], { stdio: "inherit" });
console.log(`Released v${version} to Forgejo; its Release workflow publishes it (Forgejo: Actions, workflow release.yml).`);

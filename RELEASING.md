# Releasing Yoke

This GitHub repository is a mirror. Since 2026-11-15 Yoke's canonical repository
is a private Forgejo, which copies every push here; changes land there, and a
push made directly to GitHub is overwritten by the next mirror sync.

To release, in a clone of the canonical repository with `main` green in CI:

```sh
node scripts/release.mjs 0.3.0 --dry-run   # shows the changelog section
node scripts/release.mjs 0.3.0
```

The script writes the `CHANGELOG.md` section from the conventional commits since
the last tag (`feat`, `fix`, `perf`, `deps`, `revert`, `docs`; `chore` stays
out), sets the version in `package.json` and `package-lock.json`, commits
`chore(main): release <version>`, tags `v<version>` and pushes both. The tag
reaches GitHub through the mirror and runs `.github/workflows/release.yml`,
which tests and packages the VSIX, publishes it to the VS Code Marketplace and
Open VSX, and creates the GitHub release with that changelog section as its
notes. `rescue.yml` republishes an existing tag by hand if a store refused it.

# Releasing Yoke

Yoke's canonical repository is a private Forgejo (since 2026-11-15), and its
releases are published from there. The public GitHub repository is a push
mirror: every commit and tag arrives there by itself, a push made directly to
GitHub is overwritten by the next sync, and GitHub Actions publishes nothing.

To release, in a clone whose `origin` is the Forgejo, with `main` green in CI:

```sh
node scripts/release.mjs 0.3.0 --dry-run   # shows the changelog section
node scripts/release.mjs 0.3.0
```

The script checks that `main`'s CI passed on Forgejo, writes the `CHANGELOG.md`
section from the conventional commits since the last tag (`feat`, `fix`, `perf`,
`deps`, `revert`, `docs`; `chore` stays out), sets the version in
`package.json` and `package-lock.json`, commits `chore(main): release <version>`,
tags `v<version>` and pushes both to Forgejo.

The tag runs `.forgejo/workflows/release.yml` on Forgejo, in a disposable VM:
it tests and packages the VSIX, publishes it to the VS Code Marketplace
(repository secret `VSCE_PAT`, publisher `yoketools`) and, when the secret
`OVSX_PAT` is set, to Open VSX, and creates the Forgejo release with the
changelog section as its notes and the VSIX attached. GitHub gets the tag
through the mirror, without a GitHub release page.

To publish an existing tag again (a store refused it, or a token was renewed),
run the Release workflow by hand on Forgejo (Actions, Release, Run workflow)
with the tag; a store that has that version skips it. With `publish` off, the
run does everything except publish, as a check of the path and the tokens.

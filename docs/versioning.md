# Versioning

UniCucumber uses [Semantic Versioning 2.0.0](https://semver.org/). The `version`
field in `package.json` is the single application-version source. Production builds
embed a display identifier based on it as `VITE_APP_VERSION`, which is shown in
Settings. The Unifont data version is separate and must not be used as the
application version.

When commit metadata is available, Settings appends a seven-character Git commit
identifier, for example `v1.3.0-abcdef0`. This suffix identifies the exact deployed
source revision only. The composite display string is not treated as a SemVer release
identifier and must not be written back to `package.json`, used for release tags, or
added as a changelog version. Builds without commit metadata fall back to the plain
package version.

## When to bump

- **Patch** (`x.y.Z`) for bug fixes, dependency security fixes, or documentation-only
  releases that change the published application.
- **Minor** (`x.Y.0`) for backwards-compatible user-visible features or behaviour.
- **Major** (`X.0.0`) for incompatible changes to supported workflows, persisted data,
  public integrations, or browser support.
- Use a SemVer prerelease suffix (for example, `1.4.0-beta.1`) only for a clearly
  labelled test release; do not reuse a released version.

## Release checklist

1. Choose the SemVer bump and update `package.json` with `pnpm version patch`,
   `pnpm version minor`, or `pnpm version major` (use `--no-git-tag-version` when a
   release commit needs review first).
2. Add a dated `## [x.y.z]` entry to `CHANGELOG.md` that describes user-visible
   changes and upgrade considerations.
3. Run `pnpm check` and `pnpm build`.
4. Merge the release commit, then create an annotated Git tag named exactly
   `v<package.json version>` (for example, `v1.3.0`).

CI validates the SemVer value and matching changelog entry on every change. The
release-tag workflow also rejects a tag that does not equal the package version.

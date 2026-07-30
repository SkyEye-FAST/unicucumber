import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
)
const changelog = readFileSync(
  new URL('../CHANGELOG.md', import.meta.url),
  'utf8',
)
const version = packageJson.version
const releaseTag = process.env.RELEASE_TAG
const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const unreleasedHeading = /^## \[Unreleased\]$/m
const versionHeading = new RegExp(
  `^## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
  'm',
)

if (typeof version !== 'string' || !semver.test(version)) {
  throw new Error(
    `package.json version must be valid SemVer; received ${version}`,
  )
}

const unreleasedMatch = changelog.match(unreleasedHeading)
if (!unreleasedMatch || unreleasedMatch.index === undefined) {
  throw new Error('CHANGELOG.md must contain a ## [Unreleased] entry')
}

const versionMatch = changelog.match(versionHeading)
if (!versionMatch || versionMatch.index === undefined) {
  throw new Error(`CHANGELOG.md must contain a ## [${version}] entry`)
}

if (unreleasedMatch.index > versionMatch.index) {
  throw new Error(
    'CHANGELOG.md must list ## [Unreleased] before the current version entry',
  )
}

if (releaseTag && releaseTag !== `v${version}`) {
  throw new Error(
    `Release tag ${releaseTag} does not match package version v${version}`,
  )
}

#!/usr/bin/env node
/**
 * Regenerate index.json (plugin market format 1) for every bundle directory
 * in this repository.
 *
 * The index records the exact Git commit, so the commit it names must already
 * exist. Run this after committing plugin code, then commit index.json on its
 * own.
 *
 * Usage:
 *   node scripts/build-index.mjs            # uses HEAD
 *   node scripts/build-index.mjs <40-hex>   # pins an explicit commit
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_URL = 'https://github.com/YellowSmallSea/dsh-plugins'
const INDEX_TITLE = { en: 'YellowSmallSea DSH plugins', zh: 'YellowSmallSea 的 DSH 插件' }
const INDEX_DESCRIPTION = {
  en: 'Bundles for the DeepSeek Harness Web UI.',
  zh: 'DeepSeek Harness Web UI 的插件集合。',
}
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function localizedMeta(directory, language) {
  const file = join(directory, 'locale', `${language}.json`)
  if (!existsSync(file)) return undefined
  const parsed = JSON.parse(readFileSync(file, 'utf8'))
  const meta = parsed?.meta
  return meta !== null && typeof meta === 'object' ? meta : undefined
}

function localized(en, zh, fallback) {
  const english = typeof en === 'string' && en.trim() !== '' ? en : fallback
  const chinese = typeof zh === 'string' && zh.trim() !== '' ? zh : english
  return { en: english, zh: chinese }
}

let commit = process.argv[2] ?? process.env.DSH_INDEX_COMMIT
if (commit === undefined) {
  try {
    commit = git(['rev-parse', 'HEAD'])
  } catch {
    console.error('No Git commit yet. Commit the plugin code first, then run this script again.')
    process.exit(1)
  }
}
if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error(`Not a 40-hex commit SHA: ${JSON.stringify(commit)}`)
  process.exit(1)
}

let publishTimestamp
if (process.env.DSH_INDEX_TIMESTAMP !== undefined) {
  publishTimestamp = Number(process.env.DSH_INDEX_TIMESTAMP)
} else {
  try {
    publishTimestamp = Number(git(['show', '-s', '--format=%ct', commit]))
  } catch {
    console.error(`Commit ${commit} does not exist in this repository yet. Push it first.`)
    process.exit(1)
  }
}
if (!Number.isInteger(publishTimestamp) || publishTimestamp < 0 || publishTimestamp >= 1e11) {
  console.error(`Invalid publish timestamp: ${String(publishTimestamp)}`)
  process.exit(1)
}

const plugins = []
for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) continue
  const directory = join(ROOT, entry.name)
  const manifestPath = join(directory, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const patch = manifest?.dsh?.bundle?.patch
  if (typeof patch !== 'string') continue

  const name = manifest.name
  const version = manifest.version
  if (typeof name !== 'string' || !PACKAGE_NAME.test(name)) throw new Error(`${entry.name}: invalid package name`)
  if (typeof version !== 'string' || !SEMVER.test(version)) throw new Error(`${entry.name}: invalid version`)
  if (manifest.private === true) throw new Error(`${entry.name}: a private package cannot be published in an index`)
  if (!existsSync(join(directory, patch))) throw new Error(`${entry.name}: bundle patch ${patch} is missing`)

  const en = localizedMeta(directory, 'en')
  const zh = localizedMeta(directory, 'zh')
  const icon = existsSync(join(directory, 'icon.svg')) ? `${entry.name}/icon.svg` : undefined
  const keywords = Array.isArray(manifest.keywords)
    ? manifest.keywords.filter((keyword) => typeof keyword === 'string' && keyword !== '')
    : []

  plugins.push({
    name,
    title: localized(en?.title, zh?.title, name),
    description: localized(en?.description, zh?.description, manifest.description ?? name),
    ...(icon === undefined ? {} : { icon }),
    ...(typeof manifest.author === 'string' ? { author: manifest.author } : {}),
    homepage: `${REPO_URL}/tree/main/${entry.name}`,
    repository: { url: REPO_URL, directory: entry.name },
    metadata: { keywords },
    versions: [
      {
        version,
        publishTimestamp,
        source: { type: 'git', url: REPO_URL, commit, path: entry.name },
      },
    ],
  })
}

if (plugins.length === 0) {
  console.error('No bundle directories found; nothing to index.')
  process.exit(1)
}

plugins.sort((left, right) => left.name.localeCompare(right.name))

const index = {
  format: 1,
  title: INDEX_TITLE,
  description: INDEX_DESCRIPTION,
  plugins,
}

const target = join(ROOT, 'index.json')
writeFileSync(target, `${JSON.stringify(index, null, 2)}\n`, 'utf8')

console.log(`Wrote ${target} for commit ${commit}`)
for (const plugin of plugins) {
  console.log(`  ${plugin.name}@${plugin.versions[0].version}  path:${plugin.repository.directory}`)
}
console.log('Next: git add index.json && git commit -m "chore: refresh market index" && git push')
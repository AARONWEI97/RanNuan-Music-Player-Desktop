import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = join(root, 'package.json')
const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`[sync-version] invalid package.json version: ${version}`)
  process.exit(1)
}

function updateJson(path, mutate) {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  mutate(data)
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function updateText(path, replacer) {
  const before = readFileSync(path, 'utf8')
  const after = replacer(before)
  if (after === before) return false
  writeFileSync(path, after)
  return true
}

// package-lock.json root + packages[""]
updateJson(join(root, 'package-lock.json'), (lock) => {
  lock.version = version
  if (lock.packages?.['']) lock.packages[''].version = version
})

// Tauri installer / app version
updateJson(join(root, 'src-tauri', 'tauri.conf.json'), (conf) => {
  conf.version = version
})

// Rust crate version
updateText(join(root, 'src-tauri', 'Cargo.toml'), (text) =>
  text.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`),
)

// Cargo.lock entry for local package "app"
updateText(join(root, 'src-tauri', 'Cargo.lock'), (text) =>
  text.replace(
    /(name = "app"\n)version = "[^"]+"/,
    `$1version = "${version}"`,
  ),
)

console.log(`[sync-version] synced all desktop version files → ${version}`)

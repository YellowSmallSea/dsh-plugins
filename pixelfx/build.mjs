/**
 * Build the Client half into the single-file module the DSH Web shell loads.
 *
 * esbuild bundles src/entry.js (and the vendored pixelfx sources) to CommonJS
 * with `react` left external, then the result is wrapped in the
 * `window.__ModuleLoader__.load(...)` envelope that `dsh.client` expects, so
 * the browser module table supplies React.
 *
 * Usage: node build.mjs
 */
import { build } from "esbuild"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"))

const result = await build({
  entryPoints: [join(root, "src", "entry.js")],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2020"],
  external: ["react"],
  minify: true,
  legalComments: "none",
  write: false,
  logLevel: "warning",
})

const code = result.outputFiles[0].text
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(manifest.name)},
  factory(require) {
    var module = { exports: {} };
    var exports = module.exports;
${code}
    return module.exports;
  },
});
`

await writeFile(join(root, "client.js"), wrapped, "utf8")
const bytes = Buffer.byteLength(wrapped)
console.log(`client.js written: ${(bytes / 1024).toFixed(1)} KiB`)
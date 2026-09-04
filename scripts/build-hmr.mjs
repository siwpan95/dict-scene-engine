// 构建官方 @cordisjs/plugin-hmr（源码未发布到 npm，本地从 E:\run and run 源码构建）
//
// 用法：node scripts/build-hmr.mjs
// 产物：vendor/plugin-hmr/index.js（cordis.yml 中以相对路径引用）
//
// 说明：
//   - TS 源码由 esbuild 打包，npm 依赖全部 external（运行时从项目 node_modules 解析）
//   - .yml 语言文件通过插件转成 JS 对象导出（esbuild 不认识 yaml）

import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { load } from 'js-yaml'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.env.HMR_SRC ?? 'E:/run and run/cordis-4.0.0-rc.9/packages/hmr/src/index.ts'
const OUT = join(root, 'vendor/plugin-hmr/index.js')

/** 把 .yml 当作模块：转 JSON 后以 default 导出 */
const yamlPlugin = {
  name: 'yml',
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /\.yml$/ }, async (args) => {
      const raw = await readFile(args.path, 'utf8')
      return { contents: `export default ${JSON.stringify(load(raw))}`, loader: 'js' }
    })
  },
}

await build({
  entryPoints: [SRC],
  outfile: OUT,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: [
    'cordis',
    'cosmokit',
    'chokidar',
    'picomatch',
    'schemastery',
    '@babel/code-frame',
    '@cordisjs/*',
    'node:*',
  ],
  plugins: [yamlPlugin],
  logLevel: 'info',
})

console.log('built ->', OUT)

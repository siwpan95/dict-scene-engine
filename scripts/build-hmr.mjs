// 构建官方 @cordisjs/plugin-hmr（该包未发布到 npm，需从本地 cordis 源码构建）
//
// 用法：node scripts/build-hmr.mjs        （或 npm run build:hmr）
// 产物：vendor/plugin-hmr/index.js（cordis.yml 中以相对路径引用）
// 自定义源码位置：HMR_SRC=<path> node scripts/build-hmr.mjs
//
// 源码查找顺序（不再硬编码任何机器相关路径）：
//   1. HMR_SRC 环境变量
//   2. 仓库同级目录 ./cordis-4.0.0-rc.9/packages/hmr/src/index.ts
//   3. 项目内     ./cordis-4.0.0-rc.9/packages/hmr/src/index.ts
//
// 说明：
//   - TS 源码由 esbuild 打包，npm 依赖全部 external（运行时从项目 node_modules 解析）
//   - .yml 语言文件通过插件转成 JS 对象导出（esbuild 不认识 yaml）

import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { load } from 'js-yaml'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'vendor/plugin-hmr/index.js')

const RELATIVE_SRC = join('cordis-4.0.0-rc.9', 'packages', 'hmr', 'src', 'index.ts')
const candidates = [
  process.env.HMR_SRC,
  join(root, '..', RELATIVE_SRC),
  join(root, RELATIVE_SRC),
].filter(Boolean)

const SRC = candidates.find((p) => existsSync(p))
if (!SRC) {
  console.error('找不到 cordis 源码中的 HMR 插件，请任选其一：')
  console.error(`  1. 把 cordis-4.0.0-rc.9 源码放到项目同级目录（期望：${join(root, '..', RELATIVE_SRC)}）`)
  console.error('  2. 用 HMR_SRC 环境变量指定：HMR_SRC=<path>/packages/hmr/src/index.ts npm run build:hmr')
  console.error(`已尝试：\n${candidates.map((p) => '  - ' + p).join('\n')}`)
  process.exit(1)
}
console.log('hmr source:', SRC)

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

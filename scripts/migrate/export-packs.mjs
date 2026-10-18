// 内容包导出：Node ESM → JSON（迁移 cordis-py 的第一步）
//
// 为什么用 node 自己 import：内容包是 ESM 模块，可能有计算属性/展开运算，
// 只有 node 的模块加载器能给出求值后的真实数据。正则扒源码必然漏。
// 导出后交给 scripts/migrate/json2yaml.py 转成 Python 引擎的 YAML 内容包。
//
// 用法：node scripts/migrate/export-packs.mjs

import { readdir, writeFile } from 'node:fs/promises'

const files = (await readdir(new URL('../../content/', import.meta.url)))
  .filter((f) => f.endsWith('.js'))
  .sort()

const packs = []
for (const file of files) {
  const mod = await import(new URL(`../../content/${file}`, import.meta.url).href)
  const scenes = mod.default ?? {}
  const manifest = mod.pack ?? {}
  packs.push({ file, manifest, scenes, sceneCount: Object.keys(scenes).length })
  console.log(`${file}: ${Object.keys(scenes).length} 场景`)
}

await writeFile(
  new URL('./packs-export.json', import.meta.url),
  JSON.stringify(packs, null, 2),
  'utf8',
)
console.log(`\n导出 ${packs.length} 个内容包 → scripts/migrate/packs-export.json`)

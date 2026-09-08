// AI 内容产线 · JSON → 内容包转换器（P0，见 ai-content-pipeline-plan §3）
//
// 用法：node scripts/ai/convert.mjs <draft.json> [--out content/<ns>.js]
// 职责：
//   1. 结构护栏（LLM 输出视为不可信）：
//      - 键/路径黑名单：__proto__ / constructor / prototype（含 do 的点路径）
//      - 场景 ID 与命名空间命名校验（与 lint ID_PATTERN 同口径）
//      - 场景与选项最小结构（text 必填、choices 数组、goto 字段类型）
//   2. 输出为固定模板 ESM（export default <字面量>）——LLM 无代码自由度，
//      天然排除语法注入/require/import/eval 等形态；真正的内容裁决在
//      lint/traverse/coverage（convert 不做语义校验）。
//   3. meta.namespace 与场景 ID 前缀一致性校验。
//
// 设计对照：方案文档 §3"关键决策：JSON 而非 JS 作为 LLM 交互格式"。

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ID_PATTERN = /^[a-z][a-z0-9]*([-_][a-z0-9]+)*(\.[a-z0-9]+([-_][a-z0-9]+)*)*$/
const UNSAFE_SEG = new Set(['__proto__', 'constructor', 'prototype'])
const hasUnsafeKey = (p) => String(p).split('.').some((s) => UNSAFE_SEG.has(s))

function fail(msg) {
  process.stderr.write(`convert: ${msg}\n`)
  process.exit(1)
}

function assertPack(pack, ns) {
  const errors = []
  for (const [id, scene] of Object.entries(pack)) {
    if (!ID_PATTERN.test(id)) errors.push(`场景 ID 命名非法: ${id}`)
    if (!id.startsWith(ns + '.')) errors.push(`场景 ${id} 不属于命名空间 ${ns}（P0：同包单命名空间）`)
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) { errors.push(`${id}: 场景必须是对象`); continue }
    if (typeof scene.text !== 'string' || !scene.text) errors.push(`${id}: 缺少 text`)
    if (scene.choices !== undefined && !Array.isArray(scene.choices)) errors.push(`${id}: choices 必须是数组`)
    for (const [i, c] of (scene.choices ?? []).entries()) {
      if (!c || typeof c !== 'object' || typeof c.text !== 'string') { errors.push(`${id}#${i + 1}: 选项缺 text`); continue }
      if (c.goto !== undefined && typeof c.goto !== 'string') errors.push(`${id}#${i + 1}: goto 必须是字符串`)
      if (typeof c.if === 'string') {
        if (/__proto__|constructor\b|prototype\b/.test(c.if)) errors.push(`${id}#${i + 1}: if 表达式含危险标识符`)
      }
      for (const k of Object.keys(c.do ?? {})) if (hasUnsafeKey(k)) errors.push(`${id}#${i + 1}: do 路径含危险段: ${k}`)
    }
    for (const k of Object.keys(scene.onEnter ?? {})) if (hasUnsafeKey(k)) errors.push(`${id}: onEnter 路径含危险段: ${k}`)
  }
  return errors
}

function main() {
  const input = process.argv[2]
  if (!input) fail('用法: node scripts/ai/convert.mjs <draft.json> [--out <path>]')
  const raw = readFileSync(resolve(root, input), 'utf8')
  let draft
  try { draft = JSON.parse(raw) } catch (e) { fail(`JSON 解析失败: ${e.message}`) }

  const meta = draft.meta ?? {}
  const ns = meta.namespace
  if (!ns || !/^[a-z][a-z0-9]*$/.test(ns)) fail('meta.namespace 缺失或非法（小写字母数字）')
  const pack = {}
  for (const [k, v] of Object.entries(draft)) if (k !== 'meta') pack[k] = v

  const errors = assertPack(pack, ns)
  if (errors.length) {
    process.stderr.write(`convert: 结构护栏拦截 ${errors.length} 项\n  - ${errors.join('\n  - ')}\n`)
    process.exit(1)
  }

  const outFlag = process.argv.indexOf('--out')
  const out = outFlag > -1 ? process.argv[outFlag + 1] : join(root, 'content', `${ns}.js`)
  const body = JSON.stringify(pack, null, 2)
  const js = `// 由 scripts/ai/convert.mjs 从 JSON 草稿生成（AI 产线 P0）—— 修改请改草稿后重新生成。
// 草稿：scripts/ai/examples/${basename(input)}
export default ${body}
`
  writeFileSync(out, js, 'utf8')
  console.log(`convert: ${Object.keys(pack).length} 场景 → ${out}`)
}

main()

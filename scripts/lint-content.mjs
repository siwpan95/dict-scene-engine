// 内容校验器（M0 基建）—— 内容扩容后逻辑不失控的关键工具
//
// 用法：npm run lint:content       （或 node scripts/lint-content.mjs）
//       node scripts/lint-content.mjs --json   以 JSON 输出，便于接入 CI
//
// 检查项：
//   1. 悬空 goto     —— 跳转目标不存在（'@' 前缀走白名单）
//   2. 不可达场景    —— 从 entry 出发 BFS 到不了的场景
//   3. 结局可达性    —— 每个 ending.* 至少一条可达路径
//   4. 变量一致性    —— 内容引用的 flags/items 必须在叙事账本声明；
//                       账本声明但内容从不读取的 → 死变量告警
//   5. 内容厚度      —— 场景文本过短告警
//   6. 疑似假选择    —— 无副作用且与其他选项同归宿的选项
//   7. ID 命名       —— 符合命名空间规范
//
// 退出码：存在 error → 1；仅 warning → 0（warning 不阻塞，但应清零）

import { readFile } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { load as loadYaml } from 'js-yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonMode = process.argv.includes('--json')

const errors = []
const warnings = []
const stats = {}

const err = (msg) => errors.push(msg)
const warn = (msg) => warnings.push(msg)

/** '@' 开头的特殊跳转目标白名单（引擎实现见 engine.js） */
const SPECIAL_GOTO = new Set(['@restart'])

/** ID 命名空间：<标识>[.<标识>]*，标识为小写字母数字（允许 - _ 连接）
 *  新内容推荐用 '.' 分层（castle.gallery），历史内容用 '-'（starport-hub）同样合法
 */
const ID_PATTERN = /^[a-z][a-z0-9]*([-_][a-z0-9]+)*(\.[a-z0-9]+([-_][a-z0-9]+)*)*$/

// ---------- 载入配置与内容 ----------
const config = loadYaml(await readFile(join(root, 'cordis.yml'), 'utf8'))
const engineEntry = config.find((e) => e.id === 'engine')?.config?.entry ?? 'start'
const packs = config.find((e) => e.id === 'scenes')?.config?.packs ?? []

const dict = Object.create(null)
for (const path of packs) {
  const mod = await import(pathToFileURL(join(root, path)).href)
  Object.assign(dict, mod.default ?? {})
}
const ids = Object.keys(dict)

// ---------- 1. ID 命名 ----------
for (const id of ids) {
  if (!ID_PATTERN.test(id)) err(`[命名] 场景 ID 不符合规范: ${id}`)
}

// ---------- 2. 文本厚度 ----------
let totalChars = 0
for (const [id, scene] of Object.entries(dict)) {
  const len = (scene.title ?? '').length + (scene.text ?? '').length +
    (scene.choices ?? []).reduce((n, c) => n + (c.text ?? '').length, 0)
  totalChars += len
  if (len < 120) {
    // 战斗场景的文本通常较短，降为告警而非错误
    const level = scene.mode === 'battle' ? warn : err
    level(`[厚度] 场景 ${id} 正文仅 ${len} 字（目标 ≥ 120）`)
  }
}
stats.scenes = ids.length
stats.chars = totalChars
stats.avgChars = Math.round(totalChars / ids.length)

// ---------- 3. 收集跳转与变量引用 ----------
const varRefs = { read: new Set(), write: new Set() }
const endings = []

const collectExprVars = (expr, target) => {
  for (const m of String(expr).matchAll(/\b(flags|items)\.([\w]+)/g)) {
    target.add(`${m[1]}.${m[2]}`)
  }
}
const collectEffectVars = (effects) => {
  for (const key of Object.keys(effects ?? {})) {
    if (key.startsWith('flags.') || key.startsWith('items.')) varRefs.write.add(key)
  }
}

for (const [id, scene] of Object.entries(dict)) {
  collectEffectVars(scene.onEnter)
  const choices = scene.choices ?? []
  // 结局判定：无选项，或所有选项都是"重开"（@restart）——后者是结算后的重玩入口
  const isEnding = scene.mode !== 'battle' &&
    (choices.length === 0 || choices.every((c) => String(c?.goto ?? '').startsWith('@')))
  if (isEnding) endings.push(id)
  for (const choice of choices) {
    if (choice.if) collectExprVars(choice.if, varRefs.read)
    collectEffectVars(choice.do)
  }
}

// ---------- 4. 悬空 goto ----------
for (const [id, scene] of Object.entries(dict)) {
  for (const [i, choice] of (scene.choices ?? []).entries()) {
    const target = choice?.goto
    if (target === undefined) {
      warn(`[悬空] ${id} 第 ${i + 1} 个选项没有 goto（玩家会卡在此场景）`)
      continue
    }
    const t = String(target)
    if (t.startsWith('@')) {
      if (!SPECIAL_GOTO.has(t)) err(`[悬空] ${id} -> ${t} 不是引擎支持的特殊目标（白名单: ${[...SPECIAL_GOTO].join(', ')}）`)
      continue
    }
    if (!(t in dict)) err(`[悬空] ${id} 第 ${i + 1} 个选项 -> "${t}" 未定义`)
  }
  // 战斗场景的胜负分支同样是跳转边（battle.onWin / onLose / onFlee）
  for (const key of ['onWin', 'onLose', 'onFlee']) {
    const t = scene.battle?.[key]
    if (t !== undefined && !(String(t) in dict)) {
      err(`[悬空] ${id} 的 battle.${key} -> "${t}" 未定义`)
    }
  }
}

// ---------- 5. 可达性 BFS ----------
const reachable = new Set()
const queue = [engineEntry]
if (!(engineEntry in dict)) err(`[可达] entry 场景 "${engineEntry}" 不存在`)
while (queue.length) {
  const id = queue.shift()
  if (reachable.has(id) || !(id in dict)) continue
  reachable.add(id)
  const scene = dict[id]
  for (const choice of scene.choices ?? []) {
    const t = String(choice?.goto ?? '')
    if (t && !t.startsWith('@') && !reachable.has(t)) queue.push(t)
  }
  // 战斗场景：胜负/逃跑分支也是可达边
  for (const key of ['onWin', 'onLose', 'onFlee']) {
    const t = scene.battle?.[key]
    if (t !== undefined && !reachable.has(String(t))) queue.push(String(t))
  }
}
for (const id of ids) {
  if (!reachable.has(id)) err(`[可达] 场景 ${id} 从 entry 不可达`)
}

// ---------- 6. 结局可达性 ----------
for (const id of endings) {
  if (!reachable.has(id)) err(`[结局] ${id} 不可达`)
}
stats.endings = endings.length
stats.endingsReachable = endings.filter((id) => reachable.has(id)).length

// ---------- 7. 疑似假选择 ----------
for (const [id, scene] of Object.entries(dict)) {
  const choices = scene.choices ?? []
  const seen = new Map()
  for (const [i, choice] of choices.entries()) {
    const hasEffect = !!choice?.do
    const hasCond = !!choice?.if
    const key = String(choice?.goto ?? '')
    if (!hasEffect && !hasCond && key) {
      if (seen.has(key)) {
        warn(`[假选择] ${id} 第 ${i + 1} 个选项与第 ${seen.get(key)} 个选项同归宿且无副作用`)
      } else {
        seen.set(key, i + 1)
      }
    }
  }
}

// ---------- 8. 与叙事账本的一致性 ----------
let ledgerDeclared = new Set()
try {
  const raw = await readFile(join(root, 'docs/NARRATIVE-LEDGER.md'), 'utf8')
  // 只解析「生效中」章节：规划中（M2/M3 才接入）的变量不参与死变量判定
  const start = raw.indexOf('## 1. 状态清单')
  const end = raw.indexOf('## 2.')
  const ledger = start >= 0 ? raw.slice(start, end > start ? end : undefined) : raw
  for (const m of ledger.matchAll(/`(flags|items)\.([\w]+)`/g)) {
    ledgerDeclared.add(`${m[1]}.${m[2]}`)
  }
} catch {
  warn('[账本] 未找到 docs/NARRATIVE-LEDGER.md，跳过变量一致性检查')
}

for (const v of [...varRefs.read, ...varRefs.write]) {
  if (!ledgerDeclared.has(v)) warn(`[账本] 内容使用了 ${v}，但叙事账本未声明`)
}
const deadVars = [...ledgerDeclared].filter((v) => !varRefs.read.has(v) && !varRefs.write.has(v))
for (const v of deadVars) warn(`[死变量] 账本声明了 ${v}，但内容既不写也不读`)
stats.flags = [...ledgerDeclared].filter((v) => v.startsWith('flags.')).length
stats.items = [...ledgerDeclared].filter((v) => v.startsWith('items.')).length
stats.deadVars = deadVars.length

// ---------- 输出 ----------
if (jsonMode) {
  console.log(JSON.stringify({ stats, errors, warnings }, null, 2))
} else {
  console.log('内容统计：')
  console.log(`  场景 ${stats.scenes} | 正文 ${stats.chars} 字 | 均长 ${stats.avgChars} 字`)
  console.log(`  结局 ${stats.endings}（可达 ${stats.endingsReachable}） | flags ${stats.flags} | items ${stats.items} | 死变量 ${stats.deadVars}`)
  if (warnings.length) {
    console.log(`\n⚠ 警告 ${warnings.length} 项：`)
    for (const w of warnings) console.log('  - ' + w)
  }
  if (errors.length) {
    console.log(`\n✘ 错误 ${errors.length} 项：`)
    for (const e of errors) console.log('  - ' + e)
  } else {
    console.log('\n✔ 无错误')
  }
}

process.exit(errors.length ? 1 : 0)

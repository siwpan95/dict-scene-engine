// 全剧情线结构-状态遍历器（"每条线都能跑到结局"的机器验证）
//
// 运行：node tests/traverse.mjs            （缺省打印覆盖摘要；退出码 0）
//       node tests/traverse.mjs --json     （输出 { reached, missing, depth } 便于 CI/留档）
//
// 定位（与既有测试分层，避免重复）：
//   lint-content    结构层：悬空/可达性/结局判定（纯图，不执行效果）
//   tests/e2e.mjs   路径层：真实进程 spawn，按输入序列走若干条完整线并断言文本
//   tests/traverse  状态层（本文件）：离线初始化 scenes/state 服务，从 entry 出发
//                    DFS——每步真实执行 onEnter/choice 效果、按状态过滤可见选项，
//                    穷举 normal 分支与模式场景的成功边（battle.onWin / trade.onEnd 等），
//                    记录每个到达的结局。它验证"每条 goto 边 + 每个效果 + 每个条件"
//                    至少被一条可达路径真实执行过一次，并给出【结局覆盖表】。
//   playthrough.mjs 转录层：真实交互进程逐线实跑，stdout 落盘留存剧本。
//
// 局限（诚实声明）：不模拟战斗回合/经营天数这类带随机或累计的插件循环——
//   战斗胜负与 tradeProfit 三档结局依赖具体过程，由 e2e 人工路径覆盖（本输出标注 missing）。
// 约束：分支按首现优先 + 每分支同场景访问上限（防 hub 往返死循环）；
//   '@restart' 视为结局叶（重开不扩展）；'@loop:' 展开（子夜集靠 flags.loop.n 推进收敛）。

import { Context } from 'cordis'
import { readFileSync, writeFileSync } from 'node:fs'
import { load as loadYaml } from 'js-yaml'
import { pathToFileURL } from 'node:url'
import { Service } from 'cordis'
import StateService from '../plugins/state.js'
import SceneService from '../plugins/scenes.js'

const root = process.cwd()
const jsonMode = process.argv.includes('--json')
const yml = loadYaml(readFileSync('cordis.yml', 'utf8'))
const stateCfg = yml.find((e) => e.id === 'state').config
const scenesCfg = yml.find((e) => e.id === 'scenes').config
const entry = yml.find((e) => e.id === 'engine').config?.entry ?? 'start'

const ctx = new Context()
ctx.baseUrl = pathToFileURL(root).href + '/'
const state = new StateService(ctx, stateCfg)
const scenes = new SceneService(ctx, scenesCfg)
await state[Service.init]?.()
await scenes[Service.init]()

// 模式场景的"成功/继续"边（跳过插件内部循环的近似：battle 走胜利、trade 走结算）
const MODE_NEXT = {
  battle: (s) => [s?.battle?.onWin, s?.battle?.onFlee, s?.battle?.onLose],
  trade: (s) => [s?.trade?.onEnd],
}

const V = 40    // 每分支同场景最大访问次数（极端兜底）
const D = 900   // 最大深度

const reached = new Map() // endingId -> { path, scenes }
// 剪枝：每个场景全局记录"已见可达目标集"；重访只有带来**新的可达目标**
// 才展开（hub 因状态新增选项、跨 spoke 前置拿到后深层解锁都属此类）。目标集
// 相同而状态不同 → 未来可达集已被覆盖，剪掉避免 hub 往返组合爆炸。
const seenGotos = new Map()

const isEnding = (scene, visible) =>
  (scene.mode == null || scene.mode === 'normal') &&
  (visible.length === 0 || visible.every((c) => String(c?.goto ?? '').startsWith('@restart')))

function walk(id, path, counts, depth, fromLoop = false) {
  if (!scenes.has(id) || depth > D) return
  const scene = scenes.get(id)
  const pre = state.snapshot()          // 未含 onEnter
  state.apply(scene.onEnter)
  const base = state.snapshot()         // 含 onEnter（可见性按此计算）
  const visible = (scene.choices ?? []).filter((c) => state.check(c.if))

  // 可达目标集（normal：可见选项的 goto；插件模式：成功/失败边）
  const gotos = new Set()
  if (scene.mode && scene.mode !== 'normal') {
    for (const t of MODE_NEXT[scene.mode]?.(scene) ?? []) {
      if (typeof t === 'string' && t && !t.startsWith('@')) gotos.add(t)
    }
  } else {
    for (const c of visible) gotos.add(String(c?.goto ?? ''))
  }

  const seen = seenGotos.get(id)
  // 时间循环（@loop 进入）豁免：每轮状态推进（flags.loop.n 等），hub 目标集可能
  // 不变但 spoke 深处的选项随状态打开——普通重访剪枝只适用于"无跨轮推进"的枢纽
  if (!fromLoop && seen && [...gotos].every((g) => seen.has(g))) {
    state.restore(pre) // 无新目标：同场景重访不再提供新分支
    return
  }
  if (!seen) seenGotos.set(id, new Set(gotos))
  else for (const g of gotos) seen.add(g)

  const c2 = { ...counts, [id]: (counts[id] ?? 0) + 1 }
  if (c2[id] > V) { state.restore(pre); return }

  const nextEdges = [...gotos]
  if (isEnding(scene, visible)) {
    if (!reached.has(id)) reached.set(id, { path: [...path, id], scenes: seenGotos.size })
  } else {
    for (const target of nextEdges) {
      if (target === '@restart' || !target) continue
      const choice = visible.find((c) => String(c?.goto ?? '') === target)
      state.restore(base) // 每个分支都从"含 onEnter"的状态出发
      if (choice && choice.do) state.apply(choice.do)
      if (target.startsWith('@loop:')) {
        const sid = target.slice(6)
        if (scenes.has(sid)) walk(sid, [...path, id], c2, depth + 1, true)
      } else if (scenes.has(target)) {
        walk(target, [...path, id], c2, depth + 1)
      }
    }
  }
  state.restore(pre)
}

walk(entry, [], {}, 0)

// 对照：全部 normal 结局（与 lint 同口径）——含不可达结局则应被 lint 拦下（双保险）
const allEndings = []
for (const [id, s] of Object.entries(scenes.dict)) {
  if ((s.mode == null || s.mode === 'normal') &&
    ((s.choices ?? []).length === 0 || (s.choices ?? []).every((c) => String(c?.goto ?? '').startsWith('@restart')))) {
    allEndings.push(id)
  }
}
const missing = allEndings.filter((e) => !reached.has(e)).sort()

if (jsonMode) {
  console.log(JSON.stringify({
    scenes: scenes.size,
    endingsTotal: allEndings.length,
    endingsReached: reached.size,
    reached: [...reached.keys()].sort(),
    missing,
    depth: D,
    visitCap: V,
  }, null, 2))
} else {
  console.log(`场景 ${scenes.size} | 结局可达 ${reached.size}/${allEndings.length}（结构-状态遍历）`)
  const missNote = missing.length ? `\n  未覆盖(需人工/插件路径): ${missing.join(', ')}` : ''
  console.log(`  覆盖结局: ${[...reached.keys()].sort().join(', ')}${missNote}`)
  if (missing.length) {
    // traverse 是"机器基线/新内容提示"，不作为失败门——
    // 总覆盖率门在 tests/coverage.mjs（traverse ∪ e2e 双缺 == 0）
    console.log(`\nℹ 有 ${missing.length} 个结局未在结构-状态遍历到达（原因见文件头"局限"）；用 tests/coverage.mjs 看总缺口。`)
  }
}

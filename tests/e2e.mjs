// 端到端验证：spawn 真实游戏进程，逐步输入并断言输出
// 运行：node tests/e2e.mjs
//
// 场景覆盖：
//   路线 A（情报+还价）：start -> gossip -> road(还价) -> castle -> ending-win
//   路线 B（战斗+断剑）：start -> forest -> wolf-win -> castle -> ending-win
//   存档链路：save a -> quit -> 重新启动 -> load a -> 场景恢复
//   结局判定：ending-win 输出（完）

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0
let failed = 0

function assert(ok, label, output = '') {
  if (ok) {
    passed++
    console.log(`  ✔ ${label}`)
  } else {
    failed++
    console.log(`  ✘ ${label}`)
    console.log(`    ---- 实际输出 ----\n${output.slice(-2000)}\n    ------------------`)
  }
}

/** 启动游戏进程，返回 { send, waitFor, kill, exit, output() }
 *  @param {{ internals?: boolean, env?: object }} options
 *         internals: 加 --expose-internals（官方 HMR 需要）
 */
function launch(options = {}) {
  const args = options.internals ? ['--expose-internals', 'game.js'] : ['game.js']
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...(options.env ?? {}) } })
  const exitPromise = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })))
  let buffer = ''
  child.stdout.on('data', (chunk) => { buffer += chunk.toString() })
  child.stderr.on('data', (chunk) => { buffer += chunk.toString() })
  return {
    send: (line) => child.stdin.write(line + '\n'),
    // 轮询检查：避免中文被 chunk 边界拆开导致单次 includes 漏检
    waitFor: (text, timeout = 8000) => new Promise((resolve) => {
      const start = Date.now()
      const timer = setInterval(() => {
        if (buffer.includes(text)) { clearInterval(timer); return resolve(true) }
        if (Date.now() - start > timeout) { clearInterval(timer); return resolve(false) }
      }, 50)
    }),
    output: () => buffer,
    // 轮询等待某文本出现 N 次（用于判断插件被重新初始化等计数场景）
    waitForCount: (text, count, timeout = 8000) => new Promise((resolve) => {
      const start = Date.now()
      const timer = setInterval(() => {
        const hits = buffer.split(text).length - 1
        if (hits >= count) { clearInterval(timer); return resolve(true) }
        if (Date.now() - start > timeout) { clearInterval(timer); return resolve(false) }
      }, 50)
    }),
    kill: () => child.kill(),
    exit: () => exitPromise,
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- 路线 A：情报 → 还价 → 胜利 ----------
{
  console.log('\n[路线A] 情报 → 还价 → 胜利')
  const g = launch()
  assert(await g.waitFor('村庄 · 晨雾'), 'A1 游戏启动，进入起始场景')
  assert(await g.waitFor('HP 20，金币 10'), 'A2 状态插值 {hp} {gold} 生效')
  assert(await g.waitFor('loaded 17 scenes'), 'A3 scenes 插件加载日志可见（多包叠加 + 试炼场，logger-console 生效）')
  g.send('3')                              // 花 5 金币打听情报
  assert(await g.waitFor('老猎人的木屋'), 'A4 条件选项跳转 gossip')
  assert(await g.waitFor('effect gold: 10 -> 5'), 'A5 onEnter 效果执行并记录日志')
  g.send('1')                              // 前往官道
  assert(await g.waitFor('官道 · 驿站'), 'A6 进入 road')
  await sleep(200)
  const roadText = g.output()
  assert(!roadText.includes('[1] 10 金币，成交'), 'A7 gold<10 时原价选项被条件过滤')
  assert(roadText.includes('讨价还价'), 'A8 flags.knowWeakness 解锁还价选项')
  g.send('1')                              // 讨价还价（原价选项被过滤后升为第 1 项）
  assert(await g.waitFor('effect gold: 5 -> 0'), 'A9a 还价扣款生效')
  assert(await g.waitFor('effect items.rusty_sword: undefined -> 1'), 'A9b 获得锈剑')
  assert(await g.waitFor('古堡 · 大门'), 'A9 到达城堡')
  g.send('1')                              // 亮出武器
  assert(await g.waitFor('结局 · 剑之认主'), 'A10 有剑 → 胜利结局')
  assert(await g.waitFor('（完）'), 'A11 无选项场景判定为结局')
  g.send('')
  await g.exit()
}

// ---------- 路线 B：战斗 → 断剑 → 胜利 ----------
{
  console.log('\n[路线B] 战斗 → 断剑 → 胜利')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('1')                              // 林间小路
  await g.waitFor('林间小路')
  g.send('1')                              // 正面迎战
  assert(await g.waitFor('effect hp: 20 -> 12'), 'B1 战斗扣血效果生效')
  assert(await g.waitFor('狼穴'), 'B2 战胜独眼狼')
  assert(await g.waitFor('effect items.broken_sword: undefined -> 1'), 'B3 拾取断剑（深层计数）')
  g.send('1')                              // 继续赶路
  await g.waitFor('古堡 · 大门')
  g.send('1')                              // 亮出断剑
  assert(await g.waitFor('结局 · 剑之认主'), 'B4 断剑同样通关（多条件 || 求值）')
  g.send('')
  await g.exit()
}

// ---------- 存档 / 读档 ----------
{
  console.log('\n[存档链路] save → quit → 重启 → load')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('1')                              // 去 forest
  await g.waitFor('林间小路')
  g.send('save a')
  assert(await g.waitFor('已保存到存档位 a'), 'C1 save 命令被 save 插件拦截并落盘')
  assert(await g.waitFor('林间小路'), 'C2 存档后重新渲染当前场景')
  g.send('quit')
  assert(await g.waitFor('游戏已退出'), 'C3 quit 退出提示')
  await g.exit()

  await sleep(300)
  const g2 = launch()
  await g2.waitFor('村庄 · 晨雾')
  g2.send('load a')
  assert(await g2.waitFor('已读取存档位 a（场景: forest）'), 'C4 重启后 load 恢复存档')
  assert(await g2.waitFor('林间小路'), 'C5 读档后回到 forest 场景')
  g2.send('quit')
  await g2.exit()
}

// ---------- 路线 D：DLC 星港（跨包跳转 + 成就） ----------
{
  console.log('\n[路线D] 星港 DLC → 情报 → 通风管道 → 胜利')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await g.waitFor('[4] 登船前往第七星港（DLC）'), 'D1 入口场景跨包跳转选项可见')
  g.send('4')
  assert(await g.waitFor('星港 · 空港大厅'), 'D2 跨包跳转到 DLC 场景')
  g.send('2')                              // 去酒吧（消耗 1 金币）
  assert(await g.waitFor('effect gold: 10 -> 9'), 'D3 消耗型效果生效')
  assert(await g.waitFor('effect flags.starportIntel: undefined -> true'), 'D4 深层标志位写入')
  assert(await g.waitFor('★ 成就解锁：星际线人'), 'D5 进入酒吧场景触发成就（事件驱动）')
  g.send('1')                              // 返回大厅
  await g.waitFor('星港 · 空港大厅')
  g.send('1')                              // 潜入货舱
  await g.waitFor('星港 · 货舱区')
  g.send('2')                              // 通风管道（需情报）
  assert(await g.waitFor('结局 · 数据核心'), 'D6 情报解锁隐藏路线（条件选项）')
  g.send('quit')
  await g.exit()
}

// ---------- 路线 E：成就命令 ----------
{
  console.log('\n[成就系统] 解锁与查看')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('1')                              // forest
  await g.waitFor('林间小路')
  g.send('1')                              // 战斗胜利 → wolf-win 场景
  assert(await g.waitFor('★ 成就解锁：屠狼者'), 'E1 战斗胜利场景触发成就')
  g.send('1')                              // 继续 → castle
  await g.waitFor('古堡 · 大门')
  g.send('achievements')
  assert(await g.waitFor('[✓] 屠狼者'), 'E2 achievements 命令列出已解锁成就')
  const list = g.output()
  assert(list.includes('[ ] 剑主'), 'E3 未解锁成就显示为空')
  g.send('quit')
  await g.exit()
}

// ---------- 路线 F：内容热重载（改字典即时生效） ----------
{
  console.log('\n[热重载] 运行中修改场景字典')
  const { readFile, writeFile } = await import('node:fs/promises')
  const demoPath = join(root, 'content/demo.js')
  const original = await readFile(demoPath, 'utf8')

  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await g.waitFor('你在晨雾中醒来'), 'F1 修改前渲染原始文本')

  // 修改 start 场景文本 → 应触发热更新并自动重渲染
  const patched = original.replace('你在晨雾中醒来', '你在星舰警报声中惊醒')
  try {
    await writeFile(demoPath, patched, 'utf8')
    assert(await g.waitFor('⚡ 内容已热更新'), 'F2 修改文件触发热重载提示')
    assert(await g.waitFor('你在星舰警报声中惊醒'), 'F3 新文本即时生效（状态保留）')
  } finally {
    await writeFile(demoPath, original, 'utf8')   // 恢复原文件
    await g.waitFor('⚡ 内容已热更新')
    await g.waitFor('你在晨雾中醒来')
  }
  g.send('quit')
  await g.exit()
}

// ---------- 路线 G：音效（事件订阅 → 程序化合成 WAV） ----------
{
  console.log('\n[音效] 事件订阅 → 程序化合成')
  const { readdir, rm, stat } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const dir = join(tmpdir(), 'dict-scene-engine-sfx')
  await rm(dir, { recursive: true, force: true })

  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('1')                              // 选择 → choice 音效；进入 forest → scene-enter 音效
  assert(await g.waitFor('林间小路'), 'G0 场景跳转正常')
  await sleep(600)
  const files = await readdir(dir).catch(() => [])
  assert(files.some((f) => f.includes('choice') && f.endsWith('.wav')), 'G1 选项事件触发音效合成')
  assert(files.some((f) => f.includes('scene-enter')), 'G2 进入场景事件触发音效')
  const sizes = await Promise.all(files.map(async (f) => (await stat(join(dir, f))).size))
  assert(sizes.length > 0 && sizes.every((s) => s > 44), 'G3 WAV 产物含有效 PCM 数据（>44 字节头）')
  g.send('quit')
  await g.exit()

  // 静音模式（DSE_MUTE=1）不应产生任何文件
  await rm(dir, { recursive: true, force: true })
  const g2 = launch({ env: { DSE_MUTE: '1' } })
  assert(await g2.waitFor('音效已静音'), 'G4 DSE_MUTE=1 时插件进入静音模式')
  await g2.waitFor('村庄 · 晨雾')
  g2.send('1')
  await g2.waitFor('林间小路')
  await sleep(600)
  const mutedFiles = await readdir(dir).catch(() => [])
  assert(mutedFiles.length === 0, 'G5 静音模式不生成任何音频文件')
  g2.send('quit')
  await g2.exit()
}

// ---------- 路线 H：战斗系统 ----------
{
  console.log('\n[战斗系统] 试炼场对局')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('5')                              // 试炼场
  assert(await g.waitFor('⚔ 第 1 回合'), 'H1 战斗模式场景由 combat 插件接管')
  assert(await g.waitFor('独眼狼'), 'H2 渲染敌人血条')
  assert(await g.waitFor('20/20'), 'H3 玩家满血进入战斗')
  g.send('a')                              // 攻击
  assert(await g.waitFor('你对独眼狼造成'), 'H4 玩家攻击结算伤害')
  assert(await g.waitFor('第 2 回合'), 'H5 回合推进（战斗状态未被重置）')
  g.send('d')                              // 防御
  assert(await g.waitFor('你举盾防御'), 'H6 防御指令生效')
  for (let i = 0; i < 10; i++) g.send('a') // 持续攻击直到分出胜负
  assert(await g.waitFor('你击败了独眼狼') || await g.waitFor('你被独眼狼击倒'), 'H7 战斗分出胜负')
  assert(await g.waitFor('战利品') || await g.waitFor('试炼场之殇'), 'H8 结算掉落或进入失败结局')
  g.send('quit')
  await g.exit()
}

// ---------- 路线 I：官方 HMR（插件级热重载） ----------
{
  console.log('\n[官方 HMR] 插件文件热重载')
  const { readFile, writeFile } = await import('node:fs/promises')
  const g = launch({ internals: true })
  assert(await g.waitFor('hmr watching'), 'I1 HMR 插件激活（--expose-internals）')
  await g.waitFor('村庄 · 晨雾')

  const file = join(root, 'plugins/combat.js')
  const original = await readFile(file, 'utf8')
  try {
    await writeFile(file, original + '\n// hmr probe\n', 'utf8')
    assert(await g.waitFor('hmr reload plugin'), 'I2 修改插件文件触发自动重载')
    // 重载是异步的（debounce + 重新 init），用计数轮询等待 init 第二次执行
    assert(await g.waitForCount('combat loaded 3 enemies', 2), 'I3 插件被重新初始化（init 再次执行）')
  } finally {
    await writeFile(file, original, 'utf8')
    await g.waitFor('hmr reload plugin')
  }
  g.send('stats')
  assert(await g.waitFor('ATK'), 'I4 重载后游戏仍可正常交互')
  g.send('quit')
  await g.exit()
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
process.exit(failed ? 1 : 0)

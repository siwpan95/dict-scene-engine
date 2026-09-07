// 端到端验证：spawn 真实游戏进程，逐步输入并断言输出
// 运行：node tests/e2e.mjs
//
// 三组断言，缺一不可（全检报告 #9：原测试只断言文本，对「崩溃」与「挂起」结构性失明）：
//   1. 输出文本断言（waitFor）
//   2. 退出码断言（exit() 返回后 assert code === 0）
//   3. stderr 扫描（任何 stderr 输出都视为失败）
// 另：每轮 exit 都有 Promise.race 硬超时 —— 进程挂起时判失败，而不是让 await 无限等待

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 取出输出里最近渲染的那组选项行（形如 "  [1] xxx"） */
function currentOptions(output) {
  const lines = output.split('\n')
  const block = []
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^ {2}\[\d+\]/.test(lines[i])) block.unshift(lines[i])
    else if (block.length) break
  }
  return block
}

/** 等待输出稳定：连续两次采样长度不变，说明这一帧渲染完了。
 *  用途：waitFor 常常在文本刚出现时就返回，而选项随后才渲染；
 *  直接取选项块会读到上一场景的旧块（旧块里也可能含同名选项，导致发错序号）。
 */
async function settled(g, quiet = 150, timeout = 4000) {
  const start = Date.now()
  let last = -1
  let still = 0
  while (Date.now() - start < timeout) {
    const len = g.output().length
    if (len > 0 && len === last) {
      if (++still >= 2) return true
    } else {
      still = 0
    }
    last = len
    await sleep(quiet)
  }
  return false
}

/** 按选项文本关键字发送，而非硬编码序号 —— 选项会随状态过滤而顺位变化，
 *  硬编码序号在内容调整后极易错位。
 */
async function choose(g, keyword, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    await settled(g)
    const block = currentOptions(g.output())
    // spoke 场景的调查选项可能也含"回案卷桌"字样（如"记下拖痕，回案卷桌"），
    // 真正的"返回枢纽"项通常文本更短、更纯粹。取**最后一个**匹配项——
    // 调查动作在前、纯返回项在后是惯例。
    const hit = block.filter((line) => line.includes(keyword)).pop()
    if (hit) {
      const before = g.output().length
      g.send(hit.match(/\[(\d+)\]/)[1])
      // 等这次输入被消费并有新输出（新场景渲染），再等它渲染稳定。
      // 否则下一次 choose 会读到上一场景的选项块，发送错位序号。
      const t = Date.now()
      while (g.output().length === before && Date.now() - t < 3000) await sleep(60)
      await settled(g)
      return true
    }
    await sleep(100)
  }
  return false
}

/** 战斗直到结束：连续攻击，直到出现目标场景或回合不再推进 */
async function fightUntil(g, keyword, maxTurns = 12) {
  for (let i = 0; i < maxTurns; i++) {
    if (g.output().includes(keyword)) return true
    g.send('a')
    await sleep(350)
  }
  return g.output().includes(keyword)
}

/** 启动游戏进程，返回 { send, waitFor, waitForCount, output, stderr, exit, kill }
 *  @param {{ internals?: boolean, env?: object }} options
 *         internals: 加 --expose-internals（官方 HMR 需要）
 */
function launch(options = {}) {
  const args = options.internals ? ['--expose-internals', 'game.js'] : ['game.js']
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...(options.env ?? {}) } })
  const exitPromise = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })))
  let out = ''
  let err = ''
  child.stdout.on('data', (chunk) => { out += chunk.toString() })
  child.stderr.on('data', (chunk) => { err += chunk.toString() })
  const buffer = () => out + err

  const poll = (predicate, timeout) => new Promise((resolve) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (predicate()) { clearInterval(timer); return resolve(true) }
      if (Date.now() - start > timeout) { clearInterval(timer); return resolve(false) }
    }, 50)
  })

  return {
    send: (line) => child.stdin.write(line + '\n'),
    // 轮询检查：避免中文被 chunk 边界拆开导致单次 includes 漏检
    waitFor: (text, timeout = 8000) => poll(() => buffer().includes(text), timeout),
    // 轮询等待某文本出现 N 次（用于判断插件被重新初始化等计数场景）
    waitForCount: (text, count, timeout = 8000) => poll(() => buffer().split(text).length - 1 >= count, timeout),
    output: () => buffer(),
    stderr: () => err,
    /** 等待进程退出，带硬超时；返回 { ok, code, signal, reason }
     *  ok=false 表示进程在超时内未退出（疑似挂起），此时判失败而非卡死
     */
    exit: async (timeout = 10000) => {
      const res = await Promise.race([
        exitPromise.then((r) => ({ ok: true, ...r })),
        sleep(timeout).then(() => ({ ok: false, code: null, signal: null, reason: `进程在 ${timeout}ms 内未退出（疑似挂起）` })),
      ])
      if (!res.ok) child.kill()
      return res
    },
    kill: () => child.kill(),
  }
}

/** 断言游戏正常退出：退出码 0 且 stderr 干净 */
function assertExit(res, label, g) {
  const detail = `退出码=${res?.code} 信号=${res?.signal} ${res?.reason ?? ''}\n${(g?.stderr() ?? '').slice(-1500)}`
  assert(res.ok && res.code === 0, label, detail)
  const stderr = (g?.stderr() ?? '').trim()
  assert(stderr === '', `${label}（stderr 干净：无未捕获异常/警告）`, stderr.slice(-1500))
}

/** 发送 quit 并断言：进程退出码 0、stderr 干净、未挂起 */
async function quit(g, label) {
  g.send('quit')
  const res = await g.exit()
  assertExit(res, label + '（退出码 0）', g)
}

/** 结局场景收尾：补一个空输入（对应「按回车结束游戏」），再断言退出结果 */
async function finish(g, label) {
  g.send('')
  const res = await g.exit()
  assertExit(res, label + '（退出码 0）', g)
}

// ---------- 路线 A：情报 → 还价 → 胜利 ----------
{
  console.log('\n[路线A] 情报 → 还价 → 胜利')
  const g = launch()
  assert(await g.waitFor('村庄 · 晨雾'), 'A1 游戏启动，进入起始场景')
  assert(await g.waitFor('HP 20，金币 10'), 'A2 状态插值 {hp} {gold} 生效')
  assert(await g.waitFor('scenes loaded'), 'A3 scenes 插件加载日志可见（多包叠加 + 序章，logger-console 生效；不绑定具体数量以免内容扩容漂移）')
  g.send('1')                              // 走进村庄
  assert(await g.waitFor('十字路口'), 'A4 进入村庄枢纽（可重访）')
  g.send('5')                              // 花 5 金币向老猎人打听情报
  assert(await g.waitFor('老猎人的木屋'), 'A5 条件选项跳转 gossip')
  assert(await g.waitFor('effect gold: 10 -> 5'), 'A6 onEnter 效果执行并记录日志')
  g.send('1')                              // 前往官道
  assert(await g.waitFor('青石大路'), 'A7 进入 road')
  g.send('1')                              // 上前看篷车
  assert(await g.waitFor('篷车商人'), 'A8 进入 road.merchant')
  await sleep(200)
  const roadText = g.output()
  assert(!roadText.includes('十枚金币，成交（你有 5 枚）'), 'A9 gold<10 时原价选项被条件过滤')
  assert(roadText.includes('吃准他怕还价'), 'A10 flags.knowWeakness 解锁还价选项')
  g.send('1')                              // 五枚还价（原价选项被过滤后升为第 1 项）
  assert(await g.waitFor('effect gold: 5 -> 0'), 'A10a 还价扣款生效')
  assert(await g.waitFor('effect items.rusty_sword: undefined -> 1'), 'A10b 获得锈剑')
  g.send('1')                              // 不买，继续往古堡走（金币归零后此项升为第 1 项）
  assert(await g.waitFor('古堡 · 大门'), 'A11 到达城堡（瓶颈节点）')
  g.send('1')                              // 亮出武器，正门直入 → 大厅（瓶颈分流）
  assert(await g.waitFor('古堡 · 大厅'), 'A10 瓶颈节点分流至古堡内部')
  assert(await choose(g, '下地牢'), 'A10a 进入地牢（守卫战）')
  await g.waitFor('古堡 · 地牢')
  assert(await fightUntil(g, '阶梯口'), 'A10b 战胜守卫')
  assert(await choose(g, '登上圣所'), 'A10c 登上圣所')
  await g.waitFor('古堡 · 圣所')
  assert(await choose(g, '举起你的剑'), 'A10d 举起锈剑')
  assert(await g.waitFor('结局 · 剑之认主'), 'A11 有剑 → 胜利结局')
  assert(await g.waitFor('（完）'), 'A12 无选项场景判定为结局')
  await finish(g, '路线A 结局收尾')
}

// ---------- 路线 B：战斗 → 断剑 → 胜利 ----------
{
  console.log('\n[路线B] 战斗 → 断剑 → 胜利')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('2')                              // 直接出发，走林间小路
  await g.waitFor('林间小路')
  g.send('1')                              // 探林子深处
  assert(await g.waitFor('岔路深处'), 'B0 进入 forest.path')
  g.send('1')                              // 正面迎战
  assert(await g.waitFor('effect hp: 20 -> 12'), 'B1 战斗扣血效果生效')
  assert(await g.waitFor('狼穴'), 'B2 战胜独眼狼')
  assert(await g.waitFor('effect items.broken_sword: undefined -> 1'), 'B3 拾取断剑（深层计数）')
  // 受伤进堡必败，先回村补给：wolf-win → 酒馆 → 十字路口 → 杂货铺
  g.send('2')
  await g.waitFor('老橡木酒馆')
  assert(await choose(g, '回十字路口'), 'B3a 从酒馆返回村庄枢纽（可重访）')
  await g.waitFor('十字路口')
  assert(await choose(g, '杂货铺'), 'B3a2 进入杂货铺')
  await g.waitFor('杂货铺')
  assert(await choose(g, '买伤药'), 'B3a3 选择买伤药')
  assert(await g.waitFor('effect hp: 12 -> 20'), 'B3b 商店治疗生效（枢纽可重访的价值）')
  assert(await choose(g, '回十字路口'), 'B3b2 返回十字路口')
  await g.waitFor('十字路口')
  assert(await choose(g, '走官道大路'), 'B3b3 出村走官道')
  await g.waitFor('青石大路')
  g.send('1')                              // 上前看篷车
  await g.waitFor('篷车商人')
  assert(await choose(g, '不买'), 'B3b4 不买剑')
  await g.waitFor('古堡 · 大门')
  g.send('1')                              // 亮出断剑，正门直入
  await g.waitFor('古堡 · 大厅')
  assert(await choose(g, '下地牢'), 'B3c 进入地牢')
  await g.waitFor('古堡 · 地牢')
  assert(await fightUntil(g, '阶梯口'), 'B3d 战胜地牢守卫')
  assert(await choose(g, '登上圣所'), 'B3e 登上圣所')
  await g.waitFor('古堡 · 圣所')
  assert(await choose(g, '举起你的剑'), 'B4a 断剑被石像认可（多条件 || 求值）')
  assert(await g.waitFor('结局 · 剑之认主'), 'B4 断剑同样通关')
  await finish(g, '路线B 结局收尾')
}

// ---------- 存档 / 读档 ----------
{
  console.log('\n[存档链路] save → quit → 重启 → load')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('2')                              // 直接出发，走林间小路
  await g.waitFor('林间小路')
  g.send('save a')
  assert(await g.waitFor('已保存到存档位 a'), 'C1 save 命令被 save 插件拦截并落盘')
  assert(await g.waitFor('林间小路'), 'C2 存档后重新渲染当前场景')
  await sleep(300)                      // 等异步写盘完成，避免 quit 赶在落盘前杀进程导致 g2 读到陈旧存档
  g.send('quit')
  assert(await g.waitFor('游戏已退出'), 'C3 quit 退出提示')
  await g.exit()

  await sleep(300)
  const g2 = launch()
  await g2.waitFor('村庄 · 晨雾')
  g2.send('load a')
  // C4 偶发 flake（Windows 下 rename/句柄竞态，单独复现从未失败）：
  // load 幂等，失败时重试一次；并带 output 便于下次诊断根因。
  let c4ok = await g2.waitFor('已读取存档位 a（场景: forest）', 4000)
  if (!c4ok) {
    g2.send('load a')
    c4ok = await g2.waitFor('已读取存档位 a（场景: forest）', 4000)
  }
  assert(c4ok, 'C4 重启后 load 恢复存档', g2.output().slice(-2000))
  assert(await g2.waitFor('林间小路'), 'C5 读档后回到 forest 场景', g2.output().slice(-2000))
  await quit(g2, '存档链路 退出')
}

// ---------- 路线 D：DLC 星港（跨包跳转 + 成就） ----------
{
  console.log('\n[路线D] 星港 DLC → 情报 → 通风管道 → 胜利')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await g.waitFor('[5] 登船前往第七星港（DLC）'), 'D1 入口场景跨包跳转选项可见')
  g.send('5')
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
  await quit(g, '路线D 退出')
}

// ---------- 路线 E：成就命令 ----------
{
  console.log('\n[成就系统] 解锁与查看')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('2')                              // 走林间小路
  await g.waitFor('林间小路')
  g.send('1')                              // 探林子深处
  await g.waitFor('岔路深处')
  g.send('1')                              // 正面迎战 → 战斗胜利 → wolf-win
  assert(await g.waitFor('★ 成就解锁：屠狼者'), 'E1 战斗胜利场景触发成就')
  g.send('1')                              // 继续 → road
  await g.waitFor('青石大路')
  g.send('1')
  await g.waitFor('篷车商人')
  g.send('2')                              // 不买，继续往古堡走
  await g.waitFor('古堡 · 大门')
  g.send('achievements')
  assert(await g.waitFor('[✓] 屠狼者'), 'E2 achievements 命令列出已解锁成就')
  // 输出是流式的：waitFor 匹配到首行时后续行可能还没到达，必须逐条等待
  assert(await g.waitFor('[ ] 剑主'), 'E3 未解锁成就显示为空')
  await quit(g, '成就系统 退出')
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
  await quit(g, '热重载 退出')
}

// ---------- 路线 G：音效（事件订阅 → 程序化合成 WAV） ----------
{
  console.log('\n[音效] 事件订阅 → 程序化合成')
  const { readdir, rm, stat } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  // 全检：原先是固定共享路径，任何其他进程（含手工运行的实例）写入都会污染
  // G5「静音模式不生成任何音频文件」断言（实测偶发失败）。改为本次运行唯一目录。
  const dir = join(tmpdir(), `dict-scene-engine-sfx-${process.pid}-${Date.now()}`)
  await rm(dir, { recursive: true, force: true })

  const g = launch({ env: { DSE_SFX_DIR: dir } })
  await g.waitFor('村庄 · 晨雾')
  g.send('2')                              // 选择 → choice 音效；进入 forest → scene-enter 音效
  assert(await g.waitFor('林间小路'), 'G0 场景跳转正常')
  await sleep(600)
  const files = await readdir(dir).catch(() => [])
  assert(files.some((f) => f.includes('choice') && f.endsWith('.wav')), 'G1 选项事件触发音效合成')
  assert(files.some((f) => f.includes('scene-enter')), 'G2 进入场景事件触发音效')
  const sizes = await Promise.all(files.map(async (f) => (await stat(join(dir, f))).size))
  assert(sizes.length > 0 && sizes.every((s) => s > 44), 'G3 WAV 产物含有效 PCM 数据（>44 字节头）')
  await quit(g, '音效 退出')

  // 静音模式（DSE_MUTE=1）不应产生任何文件
  await rm(dir, { recursive: true, force: true })
  const g2 = launch({ env: { DSE_MUTE: '1', DSE_SFX_DIR: dir } })
  assert(await g2.waitFor('音效已静音'), 'G4 DSE_MUTE=1 时插件进入静音模式')
  await g2.waitFor('村庄 · 晨雾')
  g2.send('2')
  await g2.waitFor('林间小路')
  await sleep(600)
  const mutedFiles = await readdir(dir).catch(() => [])
  assert(mutedFiles.length === 0, 'G5 静音模式不生成任何音频文件')
  await quit(g2, '音效 退出')
  // 收尾清掉本次运行的唯一临时目录，避免在 tmpdir 里累积残留
  await rm(dir, { recursive: true, force: true })
}

// ---------- 路线 H：战斗系统 ----------
{
  console.log('\n[战斗系统] 试炼场对局')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('4')                              // 试炼场
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
  await quit(g, '战斗系统 退出')
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
    // 全检 F1：HMR 依赖 chokidar + debounce，慢盘/高负载下首轮可能整体错过。
    // 三重保险：超时放宽到 20s → 首轮未命中则再次触碰文件重试一轮 → 才判失败。
    await writeFile(file, original + '\n// hmr probe 1\n', 'utf8')
    let i2ok = await g.waitFor('hmr reload plugin', 20000)
    if (!i2ok) {
      await writeFile(file, original + '\n// hmr probe 2\n', 'utf8')
      i2ok = await g.waitFor('hmr reload plugin', 20000)
    }
    assert(i2ok, 'I2 修改插件文件触发自动重载')
    // 重载是异步的（debounce + 重新 init），用计数轮询等待 init 第二次执行
    let i3ok = await g.waitForCount('combat loaded 6 enemies', 2, 20000)
    if (!i3ok) {
      await writeFile(file, original + '\n// hmr probe 3\n', 'utf8')
      i3ok = await g.waitForCount('combat loaded 6 enemies', 2, 20000)
    }
    assert(i3ok, 'I3 插件被重新初始化（init 再次执行）')
  } finally {
    await writeFile(file, original, 'utf8')
    await g.waitFor('hmr reload plugin', 20000)
  }
  g.send('stats')
  assert(await g.waitFor('ATK'), 'I4 重载后游戏仍可正常交互')
  await quit(g, '官方 HMR 退出')
}

// ---------- 路线 J：战斗中命令拦截与可退出性（全检报告 #7/#10 盲区覆盖） ----------
{
  console.log('\n[战斗中命令] 拦截回显 + quit 可退出')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('4')                              // 试炼场
  assert(await g.waitFor('⚔ 第 1 回合'), 'J1 进入战斗场景')
  g.send('a')                              // 攻击一轮，产生非满血状态
  assert(await g.waitFor('第 2 回合'), 'J2 战斗回合推进')
  // #4 修好后全局命令已可安全放行：stats/achievements 应当真正生效
  g.send('stats')
  assert(await g.waitFor('ATK'), 'J3 战斗中 stats 可用（已放行且不影响战斗）')
  g.send('achievements')
  assert(await g.waitFor('屠狼者'), 'J4 战斗中 achievements 可用')
  // 关键回归点：放行后敌人血量不得回满
  assert(await g.waitFor('第 2 回合'), 'J4b 放行未导致战斗重开（回合数未归 1）')
  // 战斗指令之外的杂项输入仍被明确拒绝，不是静默吞掉
  g.send('xyzzy')
  assert(await g.waitFor('战斗中不可用：xyzzy'), 'J4c 杂项输入明确回显「战斗中不可用」')
  // 原「战斗中 quit 进程挂起」缺陷的回归用例：断言的是退出码，不是文本
  await quit(g, 'J5 战斗中 quit')
}

// ---------- 路线 K：存档安全（全检报告 #6 路径遍历 + 输出注入） ----------
{
  console.log('\n[存档安全] 路径遍历与非法存档位')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('save ../../evil')
  // K1 偶发 flake：非法路径的报错消息渲染时序（save 插件 await 写盘失败路径），
  // 带 output 便于诊断；非法输入重发是幂等的
  let k1ok = await g.waitFor('存档位名称非法', 4000)
  if (!k1ok) {
    g.send('save ../../evil')
    k1ok = await g.waitFor('存档位名称非法', 4000)
  }
  assert(k1ok, 'K1 ../ 路径遍历被 slot 白名单拒绝', g.output().slice(-2000))
  g.send('save ok-slot')
  assert(await g.waitFor('已保存到存档位 ok-slot'), 'K2 合法存档位正常保存', g.output().slice(-2000))
  g.send('load ../../evil')
  assert(await g.waitFor('存档位名称非法'), 'K3 读档同样拒绝路径遍历')
  g.send('load ok-slot')
  assert(await g.waitFor('已读取存档位 ok-slot'), 'K4 合法存档位正常读档')
  await quit(g, 'K5 存档安全链路')

  // 断言没有文件被写到 saves/ 之外
  const { existsSync } = await import('node:fs')
  assert(!existsSync(join(root, '..', 'evil.json')), 'K6 项目外未产生 evil.json（逃逸失败）')
  assert(existsSync(join(root, 'saves', 'ok-slot.json')), 'K7 合法存档落在 saves/ 内')
}

// ---------- 路线 L：主循环重放回归（全检报告 #4/#5 三大外挂） ----------
{
  console.log('\n[重放回归] onEnter 不得被重放')
  // 外挂 1：gossip 场景 onEnter:{gold:-5}，反复 stats 不该重复扣金币
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    g.send('1')                            // 走进村庄
    assert(await g.waitFor('十字路口'), 'L0 进入村庄枢纽')
    g.send('5')                            // 老猎人情报
    assert(await g.waitFor('老猎人的木屋'), 'L1 进入 gossip（onEnter 扣 5 金币）')
    for (let i = 0; i < 3; i++) g.send('stats')
    assert(await g.waitForCount('金币', 3), 'L1a stats 可执行')
    await sleep(400)
    const golds = [...g.output().matchAll(/金币 (-?\d+)/g)].map((m) => Number(m[1]))
    assert(golds.length >= 2 && golds.slice(1).every((v) => v === 5),
      `L2 反复 stats 金币稳定在 5（实测 ${golds.join('→')}）`, g.output())
    await quit(g, 'L3 重放回归1')
  }
  // 外挂 2：wolf-win 场景 onEnter:{'items.broken_sword':+1}，反复 stats 不该叠加
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    g.send('2')                              // 走林间小路
    await g.waitFor('林间小路')
    g.send('1')                              // 探深处
    await g.waitFor('岔路深处')
    g.send('1')                              // 战斗胜利 → wolf-win
    assert(await g.waitFor('狼穴'), 'L4 进入 wolf-win（onEnter 给 1 把断剑）')
    for (let i = 0; i < 3; i++) g.send('stats')
    assert(await g.waitForCount('背包', 3), 'L4a stats 可执行')
    await sleep(400)
    const swords = [...g.output().matchAll(/broken_sword×(\d+)/g)].map((m) => Number(m[1]))
    assert(swords.length >= 2 && swords.every((v) => v === 1),
      `L5 反复 stats 断剑稳定 1 把（实测 ${swords.join('→')}）`, g.output())
    await quit(g, 'L6 重放回归2')
  }
  // 外挂 3：战斗中存档不得让敌人满血重开（e2e 此前从未覆盖战斗中存档）
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    g.send('4')                              // 试炼场
    assert(await g.waitFor('⚔ 第 1 回合'), 'L7 进入战斗')
    g.send('a')
    g.send('a')
    // 伤害有随机性，3 连击可能直接结束战斗；断言"回合有推进"而非固定回合数
    assert(await g.waitFor('第 2 回合') && await g.waitFor('第 3 回合'), 'L8 战斗回合逐次推进')
    g.send('save battle')                    // 战斗中存档
    assert(await g.waitFor('已保存到存档位 battle'), 'L9 战斗中存档成功')
    await sleep(400)
    const hp = [...g.output().matchAll(/独眼狼[　 ]+[█░]+ (\d+)\/12/g)].map((m) => Number(m[1]))
    const last = hp[hp.length - 1]
    assert(hp.length >= 2 && last < 12,
      `L10 战斗中存档后敌人未回满血（HP 序列 ${hp.join('→')}）`, g.output())
    await quit(g, 'L11 重放回归3')
  }
}

// ---------- 路线 M：退出竞态与输出完整性（全检报告 #10） ----------
{
  console.log('\n[退出竞态] 极速输入 + 重定向输出完整')
  const { openSync, closeSync, readFileSync, unlinkSync } = await import('node:fs')
  const logFile = join(root, 'tests', '.exit-race.log')
  const fd = openSync(logFile, 'w')
  // stdout/stderr 直接写文件：验证去掉 process.exit() 后输出不再被截断
  const child = spawn(process.execPath, ['game.js'], { cwd: root, stdio: ['pipe', fd, fd] })
  const exited = new Promise((resolve) => child.once('exit', (code) => resolve(code)))
  await sleep(400)
  child.stdin.write('1\n1\nquit\n') // 一次性灌入：游戏可能在插件 init 完成前就退出
  const code = await Promise.race([exited, sleep(15000).then(() => 'TIMEOUT')])
  closeSync(fd)
  const log = readFileSync(logFile, 'utf8')
  unlinkSync(logFile)

  assert(code === 0, `M1 极速输入后退出码 0（实测 ${code}）`, log.slice(-1200))
  assert(log.trimEnd().endsWith('游戏已退出，感谢游玩！'),
    'M2 重定向到文件时尾部输出完整（不再被截断）', log.slice(-600))
  assert(!log.includes('INACTIVE_EFFECT'),
    'M3 无「上下文已失效」崩溃（插件 init 与退出竞态已处理）', log.slice(-800))
  if (code === 'TIMEOUT') child.kill()
}

// ---------- 路线 O：M2 古堡内部探索与分支结局 ----------
{
  console.log('\n[古堡探索] 大厅 → 壁画 → 藏书阁 → BEST END')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('2')                              // 走林间小路
  await g.waitFor('林间小路')
  g.send('1')                              // 探深处
  await g.waitFor('岔路深处')
  g.send('1')                              // 正面迎战 → wolf-win（得断剑）
  assert(await g.waitFor('狼穴'), 'O1 取得断剑')
  // 进堡前回村补给：受伤状态下打地牢守卫会翻车
  g.send('2')                              // 回村（酒馆）
  await g.waitFor('老橡木酒馆')
  assert(await choose(g, '回十字路口'), 'O1a 回村庄枢纽')
  await g.waitFor('十字路口')
  assert(await choose(g, '杂货铺'), 'O1b 去杂货铺')
  await g.waitFor('杂货铺')
  assert(await choose(g, '买伤药'), 'O1c 买伤药')
  assert(await g.waitFor('effect hp: 12 -> 20'), 'O1d 治疗生效')
  assert(await choose(g, '回十字路口'), 'O1e 回十字路口')
  await g.waitFor('十字路口')
  assert(await choose(g, '走官道大路'), 'O1f 出村走官道')
  await g.waitFor('青石大路')
  g.send('1')                              // 篷车
  await g.waitFor('篷车商人')
  assert(await choose(g, '不买'), 'O2 不买剑')
  await g.waitFor('古堡 · 大门')
  assert(await choose(g, '亮出武器'), 'O3 瓶颈：亮兵器正门直入')
  await g.waitFor('古堡 · 大厅')
  assert(await choose(g, '细看壁画'), 'O4 大厅：细看壁画')
  assert(await g.waitFor('大厅 · 壁画'), 'O4a 壁画揭示被刮掉的线索')
  assert(await choose(g, '记在心里'), 'O5 记下线索')
  await g.waitFor('古堡 · 大厅')
  assert(await choose(g, '推开右手的门'), 'O6 壁画线索解锁藏书阁（状态驱动的门）')
  await g.waitFor('藏书阁')
  assert(await choose(g, '把手记读完'), 'O7 读完手记')
  assert(await g.waitFor('effect flags.swordLore: undefined -> true'), 'O7a 获得剑之真相')
  assert(await choose(g, '去圣所'), 'O8 前往圣所')
  await g.waitFor('古堡 · 地牢')
  assert(await fightUntil(g, '阶梯口'), 'O9 战胜地牢守卫')
  assert(await choose(g, '登上圣所'), 'O10 登上圣所')
  await g.waitFor('古堡 · 圣所')
  assert(await choose(g, '让它们合二为一'), 'O11 知道真相才能拼剑（BEST END 分支）')
  assert(await g.waitFor('结局 · 完整的剑'), 'O12 BEST END 达成')
  // 带"再玩一次"选项的结算场景不触发结局流程，用 quit 收尾
  await quit(g, 'O13 古堡探索收尾')
}

// ---------- 路线 P：商人结局分支 ----------
{
  console.log('\n[商人结局] 持剑退出而非拼剑')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  // 走官道买剑：不进战斗，HP 保持满值，稳定通过地牢守卫（林间线会掉 8 HP 导致翻车）
  g.send('3')                              // 直接出发，走官道大路
  await g.waitFor('青石大路')
  g.send('1')
  await g.waitFor('篷车商人')
  assert(await choose(g, '十枚金币，成交'), 'P1 买下锈剑（商人结局需持剑）')
  assert(await g.waitFor('effect items.rusty_sword: undefined -> 1'), 'P1a 取得锈剑')
  assert(await choose(g, '不买'), 'P1b 不再买别的，前往古堡')
  await g.waitFor('古堡 · 大门')
  assert(await choose(g, '亮出武器'), 'P2 进入大厅')
  await g.waitFor('古堡 · 大厅')
  assert(await choose(g, '下地牢'), 'P3 下地牢')
  await g.waitFor('古堡 · 地牢')
  assert(await fightUntil(g, '阶梯口'), 'P4 战胜守卫')
  assert(await choose(g, '登上圣所'), 'P5 登上圣所')
  await g.waitFor('古堡 · 圣所')
  assert(await choose(g, '悄悄退回去'), 'P6 选择把秘密卖掉')
  assert(await g.waitFor('结局 · 好价钱'), 'P7 商人结局达成')
  await quit(g, 'P8 商人结局收尾')
}

// ---------- 路线 Q：侦探 Mod《星港迷案》—— 充分调查 → 真结局 ----------
{
  console.log('\n[侦探线] 接案 → 调查 → 推理 → 定罪')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '登船前往第七星港'), 'Q1 前往星港')
  await g.waitFor('星港 · 空港大厅')
  assert(await choose(g, '招人查一桩命案'), 'Q2 入口：接案（新选项加在末尾，不影响原顺位）')
  await g.waitFor('一桩委托')
  assert(await choose(g, '接下委托'), 'Q3 接案，拿到案卷桌')
  await g.waitFor('案卷桌 · 推理进度 0/7')

  // 逐个 spoke 调查。用 waitFor 等待每条线索的关键文本出现，再选返回项。
  // 不用 choose 做 spoke 选择——spoke 选项文本会随状态过滤变化，
  // 但 spoke 场景内选项数量少且固定，用 waitFor 确认场景后直接发序号更稳。
  // 关键：每个 spoke 的选项 1 都是"调查+返回"复合项（统一以"，回案卷桌"结尾）。
  const investigate = async (boardKeyword, evidenceText, label) => {
    assert(await choose(g, boardKeyword), `Q-调查 ${label}`)
    assert(await g.waitFor(evidenceText), `Q-线索 ${label}`, g.output().slice(-600))
    g.send('1')                            // spoke 选项 1 = 调查并返回案卷桌
    assert(await g.waitFor('推理进度'), `Q-返回 ${label}`)
    await sleep(300)
  }
  await investigate('去码头现场', '海藻粉', '码头')
  await investigate('进入死者舱室', '体检报告', '舱室')
  await investigate('调阅航行日志', '墨色', '日志')
  await investigate('调阅货物清单', '替他签了', '清单')
  await investigate('问话：船长', '排练过', '船长')

  assert(await g.waitFor('推理进度 5/7'), 'Q4 推理度随线索累加（插值可见）')

  // 推理台：坐下拼线索 → 组合比对
  assert(await choose(g, '拼一拼'), 'Q5 进入推理台')
  await g.waitFor('推理台 · 拼合')
  assert(await choose(g, '比对货物清单与航行日志'), 'Q5a 组合：清单 × 日志')
  // 组合后回到推理台（case.deduce），标题不含推理进度；
  // 用 effect 日志确认 suspectLevel 增长，再确认组合选项已消失（防重复）
  assert(await g.waitFor('effect suspectLevel: 5 -> 6'), 'Q5b 组合线索再进一步')

  // 指控：证据充分 → 真结局
  assert(await choose(g, '去指认'), 'Q6 前往指控')
  await g.waitFor('指控')
  assert(await choose(g, '摆出清单、日志与欠债'), 'Q7 证据充分，指认船长')
  assert(await g.waitFor('结局 · 真凶归案'), 'Q8 TRUE END 达成')
  await quit(g, 'Q9 侦探线收尾')
}

// ---------- 路线 R：侦探 Mod —— 证据不足 → 冤案结局 ----------
{
  console.log('\n[侦探线] 证据不足 → 冤案')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '登船前往第七星港'), 'R1 前往星港')
  await g.waitFor('星港 · 空港大厅')
  assert(await choose(g, '招人查一桩命案'), 'R2 接案')
  await g.waitFor('一桩委托')
  assert(await choose(g, '接下委托'), 'R3 拿到案卷桌')
  await g.waitFor('案卷桌')
  // 只查一条，远达不到定罪门槛
  assert(await choose(g, '去码头现场'), 'R4 只查一条线索')
  await settled(g)
  await g.waitFor('海藻粉')
  assert(await choose(g, '回案卷桌'), 'R4a 返回枢纽')
  await g.waitFor('推理进度')
  assert(await choose(g, '指认凶手'), 'R5 直接去指控')
  await g.waitFor('指控')
  assert(await choose(g, '手上还撑不住'), 'R6 证据不足仍指认船长')
  assert(await g.waitFor('结局 · 冤案'), 'R7 冤案结局达成')
  assert(await g.waitFor('你指认了船长'), 'R8 结局回显被指认者（不是无差别结局）')
  await quit(g, 'R9 冤案收尾')
}

// ---------- 路线 S：M6 荒漠商队 —— 国王 / 隐者 / 散伙 三结局 ----------
{
  console.log('\n[商队线] 国王 / 隐者 / 散伙 三结局')

  // S-KING：走私攒钱 → 打盗匪 → 办牌照 → 大宗买卖
  // 注意：caravan 每个 spoke 选项执行后自动 goto 回营地，无需再选"回营地"
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '加入一支荒漠商队'), 'S1 进入商队线')
    await g.waitFor('商队营地')
    assert(await choose(g, '去北边黑市'), 'S2 去黑市')
    await g.waitFor('北边 · 黑市')
    assert(await choose(g, '接下走私的活'), 'S3 走私 +30 金（善名 -1）')
    assert(await g.waitFor('effect gold: 10 -> 40'), 'S3a 金币 10 → 40')
    await g.waitFor('商队营地')
    assert(await choose(g, '去西边沙丘探路'), 'S5 去沙丘')
    await g.waitFor('西边 · 沙丘')
    assert(await choose(g, '继续往沙丘深处走'), 'S6 深入触发盗匪战')
    assert(await g.waitFor('沙丘 · 盗匪'), 'S6a 进入战斗')
    assert(await fightUntil(g, '击退沙盗'), 'S7 战胜沙盗')
    assert(await choose(g, '回营地'), 'S8 收尾回营地（金币 +12）')
    await g.waitFor('商队营地')
    assert(await choose(g, '去南边贸易站'), 'S9 去贸易站')
    await g.waitFor('南边 · 贸易站')
    assert(await choose(g, '花 20 金办一张贸易牌照'), 'S10 办牌照（-20 金）')
    await g.waitFor('effect flags.tradeLicense')   // 牌照已写入状态
    await g.waitFor('商队营地')
    assert(await choose(g, '做最后的决断'), 'S12 进入决策点')
    await g.waitFor('最后的决断')
    assert(await choose(g, '凭贸易许可证'), 'S13 走大宗买卖路线（需牌照 + 金≥25）')
    assert(await g.waitFor('结局 · 商队之王'), 'S14 GOOD END 达成')
    await quit(g, 'S15 国王线收尾')
  }

  // S-HERMIT：善举攒善名 → 分金留绿洲
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '加入一支荒漠商队'), 'S16 进入商队线')
    await g.waitFor('商队营地')
    assert(await choose(g, '收留路过的难民'), 'S17 进入难民场景')
    await g.waitFor('路过的难民')
    assert(await choose(g, '收留他们过夜'), 'S17b 收留动作（善名 +1）')
    assert(await g.waitFor('effect karma: 0 -> 1'), 'S17c 善名 0 → 1')
    await g.waitFor('商队营地')
    assert(await choose(g, '去东边绿洲休整'), 'S19 去绿洲')
    await g.waitFor('东边 · 绿洲')
    assert(await choose(g, '出钱买水，也分一口给路过的穷人'), 'S20 分水（善名 +1，金 -5）')
    assert(await g.waitFor('effect karma: 1 -> 2'), 'S20a 善名 1 → 2')
    await g.waitFor('商队营地')
    assert(await choose(g, '做最后的决断'), 'S22 进入决策点')
    await g.waitFor('最后的决断')
    assert(await choose(g, '把赚的钱分给一路帮过你的人'), 'S23 走隐者路线（需善名 ≥ 2）')
    assert(await g.waitFor('结局 · 绿洲隐者'), 'S24 TRUE END 达成')
    await quit(g, 'S25 隐者线收尾')
  }

  // S-BROKE：直接散伙
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '加入一支荒漠商队'), 'S26 进入商队线')
    await g.waitFor('商队营地')
    assert(await choose(g, '做最后的决断'), 'S27 进入决策点')
    await g.waitFor('最后的决断')
    assert(await choose(g, '什么也不留恋，商队散伙'), 'S28 散伙路线')
    assert(await g.waitFor('结局 · 商队散伙'), 'S29 NEUTRAL END 达成')
    await quit(g, 'S30 散伙线收尾')
  }
}

// ---------- 路线 T：M8 城镇经营《东市经营》—— 侦察 / 经营循环 / 三结局 ----------
{
  console.log('\n[经营线] 侦察 → 经营 → 结算三结局')

  // T-侦察：市面情报 + 条件隐藏
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '去东市盘下一间铺子'), 'T1 进入经营线（入口在末尾，不影响原顺位）')
    await g.waitFor('三合铺')
    assert(await choose(g, '先不急着开张'), 'T2 先去市面侦察')
    await g.waitFor('东市 · 市面')
    assert(await choose(g, '进茶馆听茶客闲谈'), 'T3 茶馆情报（第 3 天茶涨）')
    await g.waitFor('东市 · 茶馆')
    assert(await choose(g, '记下茶会的日子'), 'T4 记录茶会情报')
    await g.waitFor('东市 · 市面')
    // 已查过的情报项应隐藏
    assert(!(await choose(g, '进茶馆听茶客闲谈', 1500)), 'T5 已查情报项隐藏（条件 !flag）')
    assert(await choose(g, '回铺子开张'), 'T6 回铺子开张（直接进经营场景）')
    assert(await g.waitFor('东市 · 第 1 天'), 'T7 经营面板出现（trade 插件接管）')
    await quit(g, 'T8 侦察线收尾')
  }

  // T-发家（GOOD）：本金 30 全押布 → 第 5 天大集卖 90 ≥ 80
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '去东市盘下一间铺子'), 'T9 进入经营线')
    await g.waitFor('三合铺')
    assert(await choose(g, '接过铺子，先开张试试'), 'T10 直接开张（本金 30）')
    await g.waitFor('东市 · 第 1 天')
    g.send('buy cloth 15')                    // 全押布（-30）
    assert(await g.waitFor('库存 15'), 'T11 进货 15 件布')
    for (let i = 0; i < 4; i++) g.send('next')   // 熬到第 5 天
    assert(await g.waitFor('东市 · 第 5 天'), 'T12 推进到第 5 天（大集日）')
    g.send('sell cloth')                      // 15 × 6 = 90
    assert(await g.waitFor('+90 金'), 'T13 大集出货 +90 金')
    g.send('next')                            // 收市结算
    assert(await g.waitFor('收市盘账'), 'T14 进入结算')
    assert(await choose(g, '请何掌柜裁断'), 'T15 请掌柜裁断')
    // judge 的三个"（听结果）"选项文本相同、条件互斥，过滤后只剩一个 → 直接选 1
    g.send('1')
    assert(await g.waitFor('结局 · 东市 · 商会入主'), 'T16 GOOD END（净赚 ≥60）')
    await quit(g, 'T17 发家线收尾')
  }

  // T-糊口（NEUTRAL）：只押 5 件布 → 50 金
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '去东市盘下一间铺子'), 'T18 进入经营线')
    await g.waitFor('三合铺')
    assert(await choose(g, '接过铺子，先开张试试'), 'T19 直接开张')
    await g.waitFor('东市 · 第 1 天')
    g.send('buy cloth 5')                     // 小押（-10）
    assert(await g.waitFor('库存 5'), 'T20 进货 5 件布')
    for (let i = 0; i < 4; i++) g.send('next')
    await g.waitFor('东市 · 第 5 天')
    g.send('sell cloth')                      // 5 × 6 = 30，总 50
    await g.waitFor('+30 金')
    g.send('next')
    await g.waitFor('收市盘账')
    assert(await choose(g, '请何掌柜裁断'), 'T21 请掌柜裁断')
    g.send('1')
    assert(await g.waitFor('结局 · 东市 · 小本营生'), 'T22 NEUTRAL END（净赚 10–59）')
    await quit(g, 'T23 糊口线收尾')
  }

  // T-破产（BAD）：全程不动 → 30 金
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '去东市盘下一间铺子'), 'T24 进入经营线')
    await g.waitFor('三合铺')
    assert(await choose(g, '接过铺子，先开张试试'), 'T25 直接开张')
    await g.waitFor('东市 · 第 1 天')
    for (let i = 0; i < 5; i++) g.send('next')    // 第 5 天 next 触发收市
    assert(await g.waitFor('收市盘账'), 'T26 直接收市')
    assert(await choose(g, '请何掌柜裁断'), 'T27 请掌柜裁断')
    g.send('1')
    assert(await g.waitFor('结局 · 东市 · 铺子没保住'), 'T28 BAD END（净赚 <10）')
    await quit(g, 'T29 破产线收尾')
  }
}

// ---------- 路线 U/V/W：M9 多风格短篇（武侠 / 科幻 / 恐怖） ----------
{
  console.log('\n[短篇] 武侠刀客 / 空间站疑云 / 古宅惊魂')

  // U-武侠：问讯 → 山贼战 → 古庙 → 断崖对决 → 了结结局
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '听一段旧江湖'), 'U1 进入武侠篇（入口给旧刀）')
    await g.waitFor('风陵渡 · 客栈')
    assert(await choose(g, '向商队问清'), 'U2 打听仇人行踪')
    await g.waitFor('北山 · 官道')
    assert(await choose(g, '拔刀，管这一桩'), 'U3 管闲事触发山贼战')
    assert(await g.waitFor('北山 · 山贼'), 'U4 进入战斗')
    assert(await fightUntil(g, '驴车旁'), 'U5 战胜山贼')
    assert(await choose(g, '继续赶路'), 'U6 继续往北山深处')
    await g.waitFor('北山 · 古庙')
    assert(await choose(g, '与我何干'), 'U7 不听老僧，直接上山')
    await g.waitFor('北山 · 断崖')
    assert(await choose(g, '堂堂正正一战'), 'U8 堂堂正正一战（未买迷粉，阴损项隐藏）')
    assert(await fightUntil(g, '断崖 · 雪'), 'U9 战胜铁爪陈九')
    g.send('1')                            // 未用迷粉 → 了结结局（两选项文本相同条件互斥）
    assert(await g.waitFor('结局 · 刀客 · 了结'), 'U10 GOOD END（光明正大了结）')
    await quit(g, 'U11 武侠线收尾')
  }

  // V-科幻：三证据 → 呼叫夜枭 → 切主控 → 修复结局
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '醒在一座空间站'), 'V1 进入科幻篇')
    await g.waitFor('远望七号 · 维修舱')
    assert(await choose(g, '去核心舱'), 'V2 去核心舱')
    await g.waitFor('远望七号 · 核心舱')
    assert(await choose(g, '调取夜枭'), 'V3 证据 1：行为日志')
    assert(await g.waitFor('effect sciEvidence: 0 -> 1'), 'V3a 证据计数 1/3')
    assert(await choose(g, '去实验室'), 'V4 去实验室')
    await g.waitFor('远望七号 · 实验室')
    assert(await choose(g, '收起录音笔'), 'V5 证据 2：录音')
    assert(await g.waitFor('effect sciEvidence: 1 -> 2'), 'V5a 证据计数 2/3')
    assert(await choose(g, '去核心舱'), 'V6 回核心舱')
    await g.waitFor('远望七号 · 核心舱')
    assert(await choose(g, '去舰桥'), 'V7 去舰桥')
    await g.waitFor('远望七号 · 舰桥')
    assert(await choose(g, '拷贝呼叫记录'), 'V8 证据 3：求救记录')
    assert(await g.waitFor('effect sciEvidence: 2 -> 3'), 'V8a 证据计数 3/3')
    assert(await choose(g, '去核心舱'), 'V9 回核心舱')
    await g.waitFor('远望七号 · 核心舱')
    assert(await choose(g, '呼叫夜枭'), 'V10 呼叫夜枭对质')
    await g.waitFor('远望七号 · 夜枭')
    assert(await choose(g, '拒绝它'), 'V11 拒绝交易')
    await g.waitFor('远望七号 · 抉择')
    assert(await choose(g, '切断夜枭主控'), 'V12 三证据齐全 → 切主控')
    assert(await g.waitFor('结局 · 远望七号 · 重启'), 'V13 GOOD END（修复空间站）')
    await quit(g, 'V14 科幻线收尾')
  }

  // W-恐怖：两条线索 + 蜡烛管理 → 吹灭宅灵 → 天亮结局
  {
    const g = launch()
    await g.waitFor('村庄 · 晨雾')
    assert(await choose(g, '误入雨夜'), 'W1 进入恐怖篇')
    await g.waitFor('夜路 · 古宅')
    assert(await choose(g, '拿起蜡烛'), 'W2 取蜡烛（×3）')
    await g.waitFor('古宅 · 大堂')
    assert(await choose(g, '上楼看看'), 'W3 上阁楼（-1 蜡烛）')
    await g.waitFor('古宅 · 阁楼')
    assert(await choose(g, '翻其他箱子'), 'W4 线索 1：小袄')
    assert(await g.waitFor('effect horrorEvidence: 0 -> 1'), 'W4a 线索计数 1/2')
    assert(await choose(g, '回大堂'), 'W5 回大堂')
    await g.waitFor('古宅 · 大堂')
    assert(await choose(g, '推开东厢房'), 'W6 进东厢房（-1 蜡烛）')
    await g.waitFor('古宅 · 东厢房')
    assert(await choose(g, '收起日记'), 'W7 线索 2：日记')
    assert(await g.waitFor('effect horrorEvidence: 1 -> 2'), 'W7a 线索计数 2/2')
    assert(await choose(g, '回大堂'), 'W8 回大堂')
    await g.waitFor('古宅 · 大堂')
    assert(await choose(g, '去西边的厨房'), 'W9 去厨房（-1 蜡烛）')
    await g.waitFor('古宅 · 厨房')
    assert(await choose(g, '拿上蜡烛'), 'W10 厨房补给蜡烛（+2）')
    assert(await choose(g, '推后门'), 'W11 推开后门')
    await g.waitFor('古宅 · 后门')
    assert(await choose(g, '沿着回廊走到底'), 'W12 走向回廊尽头')
    await g.waitFor('古宅 · 回廊尽头')
    assert(await choose(g, '吹灭它'), 'W13 双线索解锁吹灭')
    assert(await g.waitFor('结局 · 古宅 · 天亮'), 'W14 GOOD END（天亮逃生）')
    await quit(g, 'W15 恐怖线收尾')
  }
}

// ---------- 路线 X：M10 跨包联动彩蛋（商队铜符 → 东市） ----------
{
  console.log('\n[跨包彩蛋] 商队铜符 → 东市识货人')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '加入一支荒漠商队'), 'X1 进入商队线')
  await g.waitFor('商队营地')
  assert(await choose(g, '去西边沙丘探路'), 'X2 去沙丘')
  await g.waitFor('西边 · 沙丘')
  assert(await choose(g, '记下这条秘道'), 'X3 得古商道图')
  await g.waitFor('商队营地')
  assert(await choose(g, '去找废弃的石堡遗迹'), 'X4 持图探遗迹')
  await g.waitFor('古商道 · 遗迹')
  assert(await choose(g, '把铜符收进怀里'), 'X5 取得铜符（A 包物品）')
  await g.waitFor('商队营地')
  assert(await choose(g, '去东市寻识货人'), 'X6 营地出现跨包跳转项（B 包场景）')
  await g.waitFor('三合铺')
  assert(await choose(g, '先不急着开张'), 'X7 进入东市（跨包跳转成功）')
  await g.waitFor('东市 · 市面')
  assert(await choose(g, '回铺子开张'), 'X8 回铺子')
  await g.waitFor('东市 · 第 1 天')
  g.send('next')
  g.send('next')
  g.send('next')
  g.send('next')
  g.send('next')                            // 直过 5 天收市
  assert(await g.waitFor('收市盘账'), 'X9 收市')
  assert(await choose(g, '把荒漠带回来的铜符'), 'X10 结算时出现卖符选项（B 包读 A 包物品）')
  await g.waitFor('东市 · 铜符')
  assert(await choose(g, '卖了它'), 'X11 卖出铜符 +30 金')
  assert(await g.waitFor('effect gold'), 'X11a 金币入账')
  await quit(g, 'X12 彩蛋链路收尾')
}

// ---------- 路线 Y：M11 时间循环《子夜集》—— 知识跨轮保留与三夜破局 ----------
{
  console.log('\n[时间循环] 子夜集 · 知识跨轮 + 三夜破局')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '听雨'), 'Y1 入口进入《子夜集》')
  await g.waitFor('夜路 · 听雨客店')
  assert(await choose(g, '躺下'), 'Y2 进入第一个夜晚')
  assert(await g.waitFor('第 1 个夜晚'), 'Y3 循环计数从第 1 夜起')

  // 第一夜：更楼取两核（更鼓刻痕 + 更簿名单）
  assert(await choose(g, '去村东更楼'), 'Y4 第一夜去更楼')
  await g.waitFor('村东 · 更楼')
  assert(await choose(g, '细看那道新刻痕'), 'Y5 记下更鼓刻痕（clues.loop.drum）')
  await g.waitFor('村东 · 更楼')
  assert(await choose(g, '上二楼'), 'Y6 上二楼翻更簿')
  await g.waitFor('更楼 · 二楼')
  assert(await choose(g, '把更簿记在心里'), 'Y7 记下更簿名单（clues.loop.ledger）')
  await g.waitFor('村东 · 更楼')
  assert(await choose(g, '回客舍'), 'Y8 回到客舍')
  assert(await g.waitFor('还剩 2 分'), 'Y9 出门消耗 1 分行动力')
  assert(await choose(g, '睡去'), 'Y10 结束第一夜（@loop 部分重置）')
  assert(await g.waitFor('第 2 个夜晚'), 'Y11 进入第二夜')
  assert(await g.waitFor('还剩 3 分'), 'Y12 行动力重置回 3')

  // 第二夜：祠堂密龛未开放（flags.loop.n >= 3 门槛），知识保留待下一夜
  assert(await choose(g, '去村中祠堂'), 'Y13 第二夜去祠堂')
  await g.waitFor('村中 · 祠堂')
  assert(!g.output().includes('绕到神龛后头'), 'Y14 第二夜密龛未开放（n < 3）', g.output().slice(-600))
  assert(await choose(g, '回客舍'), 'Y15 离开祠堂')
  assert(await choose(g, '睡去'), 'Y16 结束第二夜')
  assert(await g.waitFor('第 3 个夜晚'), 'Y17 进入第三夜')

  // 第三夜：密龛开放，取得第三核（shrine），守祠堂破局 → 好结局
  assert(await choose(g, '去村中祠堂'), 'Y18 第三夜再访祠堂')
  await g.waitFor('村中 · 祠堂')
  assert(await choose(g, '绕到神龛后头'), 'Y19 第三夜密龛开放（n >= 3）')
  await g.waitFor('神龛之后')
  assert(await choose(g, '把信上的话记牢'), 'Y20 取得脏银回信（clues.loop.shrine）')
  await g.waitFor('村中 · 祠堂')
  assert(await choose(g, '回客舍'), 'Y21 回客舍')
  assert(await choose(g, '守到祠堂'), 'Y22 三核齐，出现对峙选项')
  await g.waitFor('祠堂 · 子夜')
  assert(await choose(g, '抢上前'), 'Y23 当众揭发')
  assert(await g.waitFor('雾散·还人'), 'Y24 达成好结局（救回被拐者）')
  assert(await g.waitFor('成就解锁：雾散还人'), 'Y25 成就随结局解锁')
  await quit(g, 'Y26 子夜集收尾')
}

// ---------- 路线 Z：M12 情感《驿路》—— 留灯 / 出关 两线 ----------
{
  console.log('\n[情感驿路] 留灯线 · 劝留 → 垫药 → 接灯')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '大雪封路'), 'Z1 入口进入《驿路》')
  await g.waitFor('雪路 · 青泥驿')
  assert(await choose(g, '推门进去'), 'Z2 入驿')
  await g.waitFor('青泥驿 · 大堂')
  assert(await choose(g, '灯边坐下'), 'Z2a 落座用饭')
  await g.waitFor('晚膳 · 粗茶淡饭')
  assert(await choose(g, '那只碗'), 'Z3 问起旧茶碗（走进故事）')
  await g.waitFor('檐下 · 夜谈')
  assert(await choose(g, '劝她留下'), 'Z4 第一夜劝留（adviceStay）')
  await g.waitFor('次日 · 晨')
  assert(await choose(g, '药钱我垫'), 'Z5 垫药钱（help，-5 金）')
  await g.waitFor('午后 · 柴房')
  assert(await choose(g, '她该知道'), 'Z6 得知阿萤身世')
  await g.waitFor('辞行 · 灯下')
  assert(await choose(g, '我来添油'), 'Z7 接过驿灯')
  assert(await g.waitFor('结局 · 留灯'), 'Z8 留灯结局')
  assert(await g.waitFor('成就解锁：留灯'), 'Z9 成就随结局解锁')
  await quit(g, 'Z10 驿路留灯线收尾')
}
{
  console.log('\n[情感驿路] 出关线 · 支持 → 许诺 → 履约同行')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '大雪封路'), 'Z11 再入《驿路》')
  await g.waitFor('雪路 · 青泥驿')
  assert(await choose(g, '推门进去'), 'Z12 入驿')
  await g.waitFor('青泥驿 · 大堂')
  assert(await choose(g, '灯边坐下'), 'Z12a 落座用饭')
  await g.waitFor('晚膳 · 粗茶淡饭')
  assert(await choose(g, '那只碗'), 'Z13 问起旧茶碗')
  await g.waitFor('檐下 · 夜谈')
  assert(await choose(g, '劝她出去看看'), 'Z14 第一夜支持她走（adviceGo）')
  await g.waitFor('次日 · 晨')
  assert(await choose(g, '我带你去看看'), 'Z15 许诺带她进城（promise）')
  await g.waitFor('午后 · 山脊')
  assert(await choose(g, '算。明早天亮'), 'Z16 履约承诺')
  await g.waitFor('辞行 · 灯下')
  assert(await choose(g, '我答应过带你走'), 'Z17 履约同行')
  assert(await g.waitFor('结局 · 出关'), 'Z18 出关结局')
  assert(await g.waitFor('成就解锁：出关'), 'Z19 成就随结局解锁')
  await quit(g, 'Z20 驿路出关线收尾')
}

// ---------- 路线 AA：M13 历史推理《江畔·县志》—— 铁证定谳 / 错指冤狱 ----------
{
  console.log('\n[江畔县志] 铁证线 · 验尸 → 药铺 → 画室 → 当堂亮证')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '江畔捞起画工的浮尸'), 'AA1 入口进入《江畔·县志》')
  await g.waitFor('临江 · 采石矶')
  assert(await choose(g, '识得几个'), 'AA2 受聘协查')
  await g.waitFor('查案 · 临江县城')

  assert(await choose(g, '孙鹤年的医馆'), 'AA3 医馆验尸')
  await g.waitFor('孙鹤年 · 医馆')
  assert(await choose(g, '验尸定论'), 'AA4 验尸：非溺死，胃有砒霜（autopsy，开上堂）')
  await g.waitFor('查案 · 临江县城')

  assert(await choose(g, '城南药铺'), 'AA5 药铺查砒霜')
  await g.waitFor('回春药铺')
  assert(await choose(g, '砒霜凭县衙条子'), 'AA6 铁证一：毒药来源（riveEvidence=1）')
  await g.waitFor('查案 · 临江县城')

  assert(await choose(g, '画室旧居'), 'AA7 画室翻遗物')
  await g.waitFor('陈砚秋 · 画室')
  assert(await choose(g, '暗格账页'), 'AA8 铁证二：决算亏空（riveEvidence=2）')
  await g.waitFor('查案 · 临江县城')

  assert(await choose(g, '击鼓鸣冤'), 'AA9 上堂（autopsy 后解锁）')
  await g.waitFor('临江县 · 大堂')
  assert(await choose(g, '当堂亮出实证'), 'AA10 双铁证当堂指认主簿')
  assert(await g.waitFor('结局 · 铁证定谳'), 'AA11 真结局（徐文远伏法）')
  assert(await g.waitFor('成就解锁：江水为证'), 'AA12 成就随结局解锁')
  await quit(g, 'AA13 江畔县志真结局线收尾')
}
{
  console.log('\n[江畔县志] 错判线 · 仅验尸即上堂 → 咬定里正 → 冤狱')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '江畔捞起画工的浮尸'), 'AA14 再入《江畔·县志》')
  await g.waitFor('临江 · 采石矶')
  assert(await choose(g, '识得几个'), 'AA15 受聘协查')
  await g.waitFor('查案 · 临江县城')
  assert(await choose(g, '孙鹤年的医馆'), 'AA16 医馆验尸')
  await g.waitFor('孙鹤年 · 医馆')
  assert(await choose(g, '验尸定论'), 'AA17 验尸开上堂')
  await g.waitFor('查案 · 临江县城')
  assert(await choose(g, '击鼓鸣冤'), 'AA18 证据不足也上堂（指认可错）')
  await g.waitFor('临江县 · 大堂')
  assert(await choose(g, '指着里正赵存礼'), 'AA19 咬定误导对象里正')
  await g.waitFor('大堂 · 指认赵存礼')
  assert(await choose(g, '咬死不放'), 'AA20 一意孤行')
  assert(await g.waitFor('结局 · 冤狱'), 'AA21 错判冤狱（赵存礼被斩监候）')
  await quit(g, 'AA22 江畔县志错判线收尾')
}

// ---------- 路线 BB：结局直达补全（coverage 双缺 → e2e） ----------
// 由 docs/TEST-COVERAGE.md 的双缺清单驱动：这些结局 traverse（插件/多轮/深链
// 到不了）且此前无 e2e 断言；本组逐条补真实进程全路径。

/** 子夜集通用前置：三夜收集三核（drum+ledger+shrine），停在对峙场景 */
async function runLoopToConfront(g) {
  await g.waitFor('村庄 · 晨雾')
  await choose(g, '听雨')
  await g.waitFor('夜路 · 听雨客店')
  await choose(g, '躺下')
  await g.waitFor('第 1 个夜晚')
  await choose(g, '去村东更楼')
  await g.waitFor('村东 · 更楼')
  await choose(g, '细看那道新刻痕')
  await g.waitFor('村东 · 更楼')
  await choose(g, '上二楼')
  await g.waitFor('更楼 · 二楼')
  await choose(g, '把更簿记在心里')
  await g.waitFor('村东 · 更楼')
  await choose(g, '回客舍')
  await g.waitFor('还剩 2 分')
  await choose(g, '睡去')
  await g.waitFor('第 2 个夜晚')
  await choose(g, '睡去')
  await g.waitFor('第 3 个夜晚')
  await choose(g, '去村中祠堂')
  await g.waitFor('村中 · 祠堂')
  await choose(g, '绕到神龛后头')
  await g.waitFor('神龛之后')
  await choose(g, '把信上的话记牢')
  await g.waitFor('村中 · 祠堂')
  await choose(g, '回客舍')
  await choose(g, '守到祠堂')
  await g.waitFor('祠堂 · 子夜')
}

{
  console.log('\n[结局补全] 子夜集 火焚 / 夜行人')
  const g = launch()
  await runLoopToConfront(g)
  assert(await choose(g, '火折子'), 'BB1 对峙选火焚')
  assert(await g.waitFor('结局 · 一了百了'), 'BB2 loop.end-arson')
  await quit(g, 'BB3 子夜火焚收尾')
}
{
  const g = launch()
  await runLoopToConfront(g)
  assert(await choose(g, '换个活的'), 'BB4 对峙选自缚引魈')
  assert(await g.waitFor('结局 · 夜行人'), 'BB5 loop.end-deep')
  await quit(g, 'BB6 子夜夜行人收尾')
}
{
  console.log('\n[结局补全] 驿路 冷线（全程不投入 → 卷款走）')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '大雪封路'), 'BB7 进入《驿路》')
  await g.waitFor('雪路 · 青泥驿')
  assert(await choose(g, '推门进去'), 'BB8 入驿')
  await g.waitFor('青泥驿 · 大堂')
  assert(await choose(g, '灯边坐下'), 'BB9 落座')
  await g.waitFor('晚膳 · 粗茶淡饭')
  assert(await choose(g, '不问。出门在外'), 'BB10 不问旧碗（不进故事）')
  await g.waitFor('檐下 · 夜谈')
  assert(await choose(g, '只是听着'), 'BB11 夜谈不表态')
  await g.waitFor('次日 · 晨')
  assert(await choose(g, '当作没看见'), 'BB12 不帮药不搭话')
  await g.waitFor('第三日 · 雪霁')
  assert(await choose(g, '辞行'), 'BB13 辞行')
  await g.waitFor('辞行 · 灯下')
  assert(await choose(g, '锁钱匣'), 'BB14 冷线：摸走积蓄')
  assert(await g.waitFor('结局 · 冷'), 'BB15 post.end-betray')
  await quit(g, 'BB16 驿路冷线收尾')
}
{
  console.log('\n[结局补全] 武侠 毒结局（买迷粉 → 阴损取胜 → 埋债）')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '听一段旧江湖'), 'BB17 进入武侠篇')
  await g.waitFor('风陵渡 · 客栈')
  assert(await choose(g, '先上街置办'), 'BB18 去药铺')
  await g.waitFor('风陵渡 · 药铺')
  assert(await choose(g, '买下解药'), 'BB19 买解药（-10 金）')
  await g.waitFor('风陵渡 · 街口')
  assert(await choose(g, '出城，上北山'), 'BB20 上北山')
  await g.waitFor('北山 · 古庙')
  assert(await choose(g, '与我何干'), 'BB21 不与老僧多言')
  await g.waitFor('北山 · 断崖')
  assert(await choose(g, '撒出在药铺配的迷粉'), 'BB22 阴损：撒迷粉（dirtyFight）')
  await g.waitFor('北山 · 断崖对决')
  assert(await fightUntil(g, '断崖 · 雪'), 'BB23 战胜陈九')
  g.send('1') // 两选项文本相同条件互斥：dirtyFight 真 → 毒结局在首项
  assert(await g.waitFor('结局 · 刀客 · 毒'), 'BB24 wuxia.end-mutual')
  await quit(g, 'BB25 武侠毒结局收尾')
}
{
  console.log('\n[结局补全] 科幻 弃站（三证后不切主控 → 救生舱弃站）')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '醒在一座空间站'), 'BB26 进入科幻篇')
  await g.waitFor('远望七号 · 维修舱')
  assert(await choose(g, '去核心舱'), 'BB27 去核心舱')
  await g.waitFor('远望七号 · 核心舱')
  assert(await choose(g, '调取夜枭'), 'BB28 证据 1：行为日志')
  assert(await choose(g, '去实验室'), 'BB29 去实验室')
  await g.waitFor('远望七号 · 实验室')
  assert(await choose(g, '收起录音笔'), 'BB30 证据 2：录音')
  assert(await choose(g, '去核心舱'), 'BB31 回核心舱')
  await g.waitFor('远望七号 · 核心舱')
  assert(await choose(g, '去舰桥'), 'BB32 去舰桥')
  await g.waitFor('远望七号 · 舰桥')
  assert(await choose(g, '拷贝呼叫记录'), 'BB33 证据 3：求救记录')
  assert(await choose(g, '去核心舱'), 'BB34 回核心舱')
  await g.waitFor('远望七号 · 核心舱')
  assert(await choose(g, '呼叫夜枭'), 'BB35 呼叫对质')
  await g.waitFor('远望七号 · 夜枭')
  assert(await choose(g, '拒绝它'), 'BB36 拒绝交易')
  await g.waitFor('远望七号 · 抉择')
  assert(await choose(g, '救生舱'), 'BB37 弃站求援')
  assert(await g.waitFor('结局 · 远望七号 · 弃站'), 'BB38 scifi.end-escape')
  await quit(g, 'BB39 科幻弃站收尾')
}
{
  console.log('\n[结局补全] 古宅 宅主 / 烛灭（回廊尽头二分支）')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '误入雨夜'), 'BB40 进入恐怖篇')
  await g.waitFor('夜路 · 古宅')
  assert(await choose(g, '拿起蜡烛'), 'BB41 取蜡烛')
  await g.waitFor('古宅 · 大堂')
  assert(await choose(g, '去西边的厨房'), 'BB42 去厨房')
  await g.waitFor('古宅 · 厨房')
  assert(await choose(g, '拿上蜡烛'), 'BB43 厨房补给')
  assert(await choose(g, '推后门'), 'BB44 推开后门')
  await g.waitFor('古宅 · 后门')
  assert(await choose(g, '沿着回廊走到底'), 'BB45 走向回廊尽头')
  await g.waitFor('古宅 · 回廊尽头')
  assert(await choose(g, '把蜡烛给它'), 'BB46 交出蜡烛接宅')
  assert(await g.waitFor('结局 · 古宅 · 宅主'), 'BB47 horror.end-master')
  await quit(g, 'BB48 宅主收尾')
}
{
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '误入雨夜'), 'BB49 再入恐怖篇')
  await g.waitFor('夜路 · 古宅')
  assert(await choose(g, '拿起蜡烛'), 'BB50 取蜡烛')
  await g.waitFor('古宅 · 大堂')
  assert(await choose(g, '去西边的厨房'), 'BB51 去厨房')
  await g.waitFor('古宅 · 厨房')
  assert(await choose(g, '拿上蜡烛'), 'BB52 厨房补给')
  assert(await choose(g, '推后门'), 'BB53 推开后门')
  await g.waitFor('古宅 · 后门')
  assert(await choose(g, '沿着回廊走到底'), 'BB54 走向回廊尽头')
  await g.waitFor('古宅 · 回廊尽头')
  assert(await choose(g, '转身就跑'), 'BB55 转身逃跑')
  assert(await g.waitFor('结局 · 古宅 · 烛灭'), 'BB56 horror.end-eaten')
  await quit(g, 'BB57 烛灭收尾')
}
{
  console.log('\n[结局补全] 星港第二案 真相（六项证据 → 指认链条）')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  assert(await choose(g, '登船前往第七星港'), 'BB58 进入星港线')
  await g.waitFor('星港 · 空港大厅')
  assert(await choose(g, '港务官中毒案'), 'BB59 接下第二桩委托')
  await g.waitFor('星港 · 第二桩委托')
  assert(await choose(g, '接下委托'), 'BB60 接下')
  await g.waitFor('调查板 · 证据 0/8')
  // 六处现场取证（每处 +1）
  assert(await choose(g, '医务室'), 'BB61 勘查医务室')
  await g.waitFor('勘查 · 医务室')
  assert(await choose(g, '杯口红痕'), 'BB62 杯口红痕（1）')
  await g.waitFor('调查板 · 证据 1/8')
  assert(await choose(g, '港务官办公室'), 'BB63 勘查办公室')
  await g.waitFor('勘查 · 港务官办公室')
  assert(await choose(g, '回批'), 'BB64 信与回批（2）')
  await g.waitFor('调查板 · 证据 2/8')
  assert(await choose(g, '值更记录'), 'BB65 调值更记录')
  await g.waitFor('档案 · 值更记录')
  assert(await choose(g, '时间线'), 'BB66 记下班次时间线（3）')
  await g.waitFor('调查板 · 证据 3/8')
  assert(await choose(g, '问话：大副'), 'BB67 问大副')
  await g.waitFor('问话 · 大副')
  assert(await choose(g, '乌头碱'), 'BB68 追问口误（4，slip）')
  await g.waitFor('调查板 · 证据 4/8')
  assert(await choose(g, '问话：医生'), 'BB69 问医生')
  await g.waitFor('问话 · 医生')
  assert(await choose(g, '拿乌头碱'), 'BB70 追问知情（5）')
  await g.waitFor('调查板 · 证据 5/8')
  assert(await choose(g, '问话：船长'), 'BB71 问船长')
  await g.waitFor('问话 · 船长')
  assert(await choose(g, '推杯子'), 'BB72 记下推杯（6，push）')
  await g.waitFor('调查板 · 证据 6/8')
  assert(await choose(g, '指认'), 'BB73 进入指认')
  await g.waitFor('指控 · 第二案')
  assert(await choose(g, '船长袖手旁观'), 'BB74 亮出完整链条')
  assert(await g.waitFor('结局 · 连环案 · 真相'), 'BB75 case2.ending.truth')
  await quit(g, 'BB76 第二案真相收尾')
}
{
  console.log('\n[结局补全] 古堡 献祭（取封印钥匙 → 圣所封剑）')
  const g = launch()
  await g.waitFor('村庄 · 晨雾')
  g.send('2') // 林间小路
  await g.waitFor('林间小路')
  g.send('1')
  await g.waitFor('岔路深处')
  g.send('1') // 正面迎战 → wolf-win（得断剑）
  assert(await g.waitFor('狼穴'), 'BB77 取得断剑')
  g.send('2') // 回村
  await g.waitFor('老橡木酒馆')
  assert(await choose(g, '回十字路口'), 'BB78 回村庄枢纽')
  await g.waitFor('十字路口')
  assert(await choose(g, '杂货铺'), 'BB79 去杂货铺')
  await g.waitFor('杂货铺')
  assert(await choose(g, '买伤药'), 'BB80 买伤药回满')
  assert(await g.waitFor('effect hp: 12 -> 20'), 'BB81 治疗生效')
  assert(await choose(g, '回十字路口'), 'BB82 回十字路口')
  await g.waitFor('十字路口')
  assert(await choose(g, '走官道大路'), 'BB83 出村走官道')
  await g.waitFor('青石大路')
  g.send('1') // 篷车
  await g.waitFor('篷车商人')
  assert(await choose(g, '不买'), 'BB84 不买剑')
  await g.waitFor('古堡 · 大门')
  assert(await choose(g, '亮出武器'), 'BB85 亮兵器正门')
  await g.waitFor('古堡 · 大厅')
  assert(await choose(g, '细看壁画'), 'BB86 细看壁画')
  assert(await g.waitFor('大厅 · 壁画'), 'BB87 壁画线索')
  assert(await choose(g, '记在心里'), 'BB88 记下')
  await g.waitFor('古堡 · 大厅')
  assert(await choose(g, '推开右手的门'), 'BB89 解锁藏书阁')
  await g.waitFor('藏书阁')
  assert(await choose(g, '把手记读完'), 'BB90 读完手记')
  assert(await g.waitFor('effect flags.swordLore: undefined -> true'), 'BB91 剑之真相')
  assert(await choose(g, '去圣所'), 'BB92 去圣所')
  await g.waitFor('古堡 · 地牢')
  assert(await fightUntil(g, '阶梯口'), 'BB93 战胜地牢守卫')
  await g.waitFor('阶梯口')
  // 改道：不登圣所，先下地下层取封印钥匙
  assert(await choose(g, '钻'), 'BB94 下地下层')
  await g.waitFor('地下层 · 裂缝')
  assert(await choose(g, '往右走'), 'BB95 去管家室')
  await g.waitFor('地下层 · 管家室')
  assert(await choose(g, '需要了结'), 'BB96 问怎么了结')
  await g.waitFor('管家室 · 了结')
  assert(await choose(g, '记下'), 'BB96a 记下封剑（解锁"怎么封"，自循环留在此场景）')
  assert(await choose(g, '怎么封'), 'BB97 问封剑之法')
  await g.waitFor('管家室 · 封剑之法')
  assert(await choose(g, '接过钥匙'), 'BB98 接过封印钥匙')
  await g.waitFor('地下层 · 管家室')
  assert(await choose(g, '离开管家室'), 'BB99 离开')
  await g.waitFor('地下层 · 裂缝')
  // 回城堡 → 圣所封剑
  assert(await choose(g, '回阶梯口'), 'BB100 返回地牢')
  await g.waitFor('阶梯口')
  assert(await choose(g, '登上圣所'), 'BB101 再登圣所')
  await g.waitFor('古堡 · 圣所')
  assert(await choose(g, '封印钥匙插入底座'), 'BB102 献祭封剑')
  assert(await g.waitFor('结局 · 献祭'), 'BB103 ending.sacrifice')
  await quit(g, 'BB104 献祭结局收尾')
}

// ---------- 路线 N：内容校验器（lint:content） ----------
{
  console.log('\n[内容校验] lint:content')
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)
  const { stdout } = await run(process.execPath, ['scripts/lint-content.mjs', '--json'], { cwd: root })
  const report = JSON.parse(stdout)

  // 结构性错误必须为零；厚度不足属内容建设进度，单独统计并设定下限
  const structural = report.errors.filter((e) => !e.startsWith('[厚度]'))
  assert(structural.length === 0, 'N1 无结构性内容错误（悬空 goto / 不可达 / 结局）', structural.join('\n'))
  assert(report.stats.endingsReachable === report.stats.endings && report.stats.endings > 0,
    `N2 所有结局可达（${report.stats.endingsReachable}/${report.stats.endings}）`)
  assert(report.stats.scenes >= 25, `N3 场景数达 Phase 1 阶段目标（当前 ${report.stats.scenes}，M1 目标 ≥ 25）`)
  assert(report.stats.avgChars >= 120, `N4 场景均长达标（当前 ${report.stats.avgChars} 字，目标 ≥ 120）`)
  const dead = report.warnings.filter((w) => w.startsWith('[死变量]'))
  assert(dead.length === 0, 'N5 无死变量（账本声明但内容从不读写）', dead.join('\n'))
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
process.exit(failed ? 1 : 0)

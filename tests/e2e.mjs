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
  assert(await g.waitFor('loaded 28 scenes'), 'A3 scenes 插件加载日志可见（多包叠加 + 序章，logger-console 生效）')
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
  g.send('1')                              // 亮出武器
  assert(await g.waitFor('结局 · 剑之认主'), 'A10 有剑 → 胜利结局')
  assert(await g.waitFor('（完）'), 'A11 无选项场景判定为结局')
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
  g.send('1')                              // 收起断剑，继续前往官道
  await g.waitFor('青石大路')
  g.send('1')                              // 上前看篷车
  await g.waitFor('篷车商人')
  g.send('2')                              // 不买，继续往古堡走
  await g.waitFor('古堡 · 大门')
  g.send('1')                              // 亮出断剑
  assert(await g.waitFor('结局 · 剑之认主'), 'B4 断剑同样通关（多条件 || 求值）')
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
  g.send('quit')
  assert(await g.waitFor('游戏已退出'), 'C3 quit 退出提示')
  await g.exit()

  await sleep(300)
  const g2 = launch()
  await g2.waitFor('村庄 · 晨雾')
  g2.send('load a')
  assert(await g2.waitFor('已读取存档位 a（场景: forest）'), 'C4 重启后 load 恢复存档')
  assert(await g2.waitFor('林间小路'), 'C5 读档后回到 forest 场景')
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
  g.send('3')                              // 不买，继续往古堡走
  await g.waitFor('古堡 · 大门')
  g.send('achievements')
  assert(await g.waitFor('[✓] 屠狼者'), 'E2 achievements 命令列出已解锁成就')
  const list = g.output()
  assert(list.includes('[ ] 剑主'), 'E3 未解锁成就显示为空')
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
  const dir = join(tmpdir(), 'dict-scene-engine-sfx')
  await rm(dir, { recursive: true, force: true })

  const g = launch()
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
  const g2 = launch({ env: { DSE_MUTE: '1' } })
  assert(await g2.waitFor('音效已静音'), 'G4 DSE_MUTE=1 时插件进入静音模式')
  await g2.waitFor('村庄 · 晨雾')
  g2.send('2')
  await g2.waitFor('林间小路')
  await sleep(600)
  const mutedFiles = await readdir(dir).catch(() => [])
  assert(mutedFiles.length === 0, 'G5 静音模式不生成任何音频文件')
  await quit(g2, '音效 退出')
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
  assert(await g.waitFor('存档位名称非法'), 'K1 ../ 路径遍历被 slot 白名单拒绝')
  g.send('save ok-slot')
  assert(await g.waitFor('已保存到存档位 ok-slot'), 'K2 合法存档位正常保存')
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

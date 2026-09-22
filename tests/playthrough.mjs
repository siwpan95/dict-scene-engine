// 完整游戏流程实跑 + 转录留存
// 运行：node tests/playthrough.mjs
//
// 复用 e2e.mjs 已验证的输入序列（每条路线都跑到结局），改用真实交互进程驱动，
// 抓取每次启动的 stdout 作为可读剧本，落盘到 deliverables/gstack/。
//
// 覆盖：手写路线（A/B/C/D/E/H/J/O~DD，停在 M14 之前）+ 生成路线（CC~FC，
// 由 scripts/gen-routes.mjs 从 e2e 实测序列抽取，覆盖千灯 / M15~M22 / P6 新内容）。
// 排除（属验证程序而非玩家流程，已在 e2e 套件覆盖）：F 热重载改文件、G 音效文件生成、
// I 官方 HMR 改文件、K 存档安全、L 重放回归、M 退出竞态、N 内容校验器。
//
// 为隔离音效产物，统一设 DSE_SFX_DIR 到本次运行唯一临时目录（运行结束清理），
// 不改写任何仓库文件、不静音（stdout 与玩家实跑一致）。

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const GIT_HEAD = (() => { try { return execSync('git rev-parse HEAD', { cwd: root }).toString().trim() } catch { return 'unknown' } })()
const GIT_TAG = (() => { try { return execSync('git describe --tags --always', { cwd: root }).toString().trim() } catch { return 'unknown' } })()
const NODE_VER = process.version
const DATE = new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// 从 e2e.mjs 复刻的进程控制助手（仅增加输入录制与 stdout 单独暴露）
// ---------------------------------------------------------------------------
function currentOptions(output) {
  const lines = output.split('\n')
  const block = []
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^ {2}\[\d+\]/.test(lines[i])) block.unshift(lines[i])
    else if (block.length) break
  }
  return block
}

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

async function choose(g, keyword, timeout = 6000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    await settled(g)
    const block = currentOptions(g.output())
    const hit = block.filter((line) => line.includes(keyword)).pop()
    if (hit) {
      const before = g.output().length
      g.send(hit.match(/\[(\d+)\]/)[1])
      const t = Date.now()
      while (g.output().length === before && Date.now() - t < 3000) await sleep(60)
      await settled(g)
      return true
    }
    await sleep(100)
  }
  return false
}

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
    waitFor: (text, timeout = 8000) => poll(() => buffer().includes(text), timeout),
    waitForCount: (text, count, timeout = 8000) => poll(() => buffer().split(text).length - 1 >= count, timeout),
    output: () => buffer(),
    stdout: () => out,
    stderr: () => err,
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

// 路线控制器：包装 launch，附加输入序列录制
function makeCtrl(g) {
  const seq = []
  const sh = (l) => { seq.push(l === '' ? '⏎（结束）' : l); g.send(l) }
  return {
    seq,
    send: sh,
    waitFor: (t, to) => g.waitFor(t, to),
    output: () => g.output(),
    stdout: () => g.stdout(),
    stderr: () => g.stderr(),
    exit: (to) => g.exit(to),
    choose: async (kw) => { const ok = await choose(g, kw); seq.push('◀ ' + kw); return ok },
    fight: async (kw, max = 14) => {
      let n = 0
      for (; n < max; n++) {
        if (g.output().includes(kw)) break
        sh('a'); await sleep(350)
      }
      seq.push('攻击×' + n)
      return g.output().includes(kw)
    },
  }
}

// ---------------------------------------------------------------------------
// 路线定义（drive(ctrl) 输入序列与 e2e.mjs 严格一致）
// ---------------------------------------------------------------------------
// 《子夜集》通用前置：三夜集齐三核（drum+ledger+shrine），停在祠堂对峙
async function loopThreeNights(c) {
  await c.choose('听雨'); await c.waitFor('夜路 · 听雨客店')
  await c.choose('躺下'); await c.waitFor('第 1 个夜晚')
  await c.choose('去村东更楼'); await c.waitFor('村东 · 更楼')
  await c.choose('细看那道新刻痕'); await c.waitFor('村东 · 更楼')
  await c.choose('上二楼'); await c.waitFor('更楼 · 二楼')
  await c.choose('把更簿记在心里'); await c.waitFor('村东 · 更楼')
  await c.choose('回客舍'); await c.waitFor('还剩 2 分')
  await c.choose('睡去'); await c.waitFor('第 2 个夜晚')
  await c.choose('睡去'); await c.waitFor('第 3 个夜晚')
  await c.choose('去村中祠堂'); await c.waitFor('村中 · 祠堂')
  await c.choose('绕到神龛后头'); await c.waitFor('神龛之后')
  await c.choose('把信上的话记牢'); await c.waitFor('村中 · 祠堂')
  await c.choose('回客舍'); await c.choose('守到祠堂')
  await c.waitFor('祠堂 · 子夜')
}

/** M14《藏晖室札记》：从村庄入口一路走到终局牌桌（1960 南港），共 22 步。
 *  走完时终局可见 4 个选项（真结局 / 诤臣 / 为国家牺牲了 / 留下），
 *  由调用方发最后一条输入决定去哪个结局。
 *
 *  导航用 send（编号）+ waitFor（场景标题）而非 choose：本线场景标题唯一、
 *  无同名干扰，编号比关键词更稳；且这些选项都没有副作用分支歧义。
 */
async function driveHushiToFinale(c) {
  await c.waitFor('村庄 · 晨雾')
  await c.choose('一九一一年的旧札记'); await c.waitFor('孛可诺松林')
  c.send('1'); await c.waitFor('绮色佳寓所')        // 起立受洗（容忍 +1）
  c.send('1'); await c.waitFor('赔款学生会')        // 赴牌局（cardsPlayed +1）
  c.send('1'); await c.waitFor('韦莲司之问')        // 接下学生会社职
  c.send('3'); await c.waitFor('得家中照片')        // 总纲：家庭从东方、政治从西方（双轴各 +1）
  c.send('1'); await c.waitFor('秋柳')              // 收照片回信（items.photo）
  c.send('2'); await c.waitFor('得冬秀书')          // 赠垂柳图 + 雪中之柳（items.willow +2）
  c.send('1'); await c.waitFor('别矣绮色佳')        // 就这样回信
  c.send('3'); await c.waitFor('九十二号')          // 入哥伦比亚
  c.send('1'); await c.waitFor('白话诗引起的风波')  // 住进 92 Haven Ave
  c.send('1'); await c.waitFor('八事')              // 「一次完全失败，何妨再来？」
  c.send('1'); await c.waitFor('近作文字')          // 八事抄寄《新青年》
  c.send('1'); await c.waitFor('读致韦女士旧函')    // 寄出去
  c.send('1'); await c.waitFor('归国记')            // 借回旧函（items.letters）
  c.send('1'); await c.waitFor('巴黎转来的电报')    // 归国
  c.send('2'); await c.waitFor('似有鬼')            // 拟电允了（flags.hushi.accepted）
  c.send('1'); await c.waitFor('二十一年')          // 「似有鬼」——当作笑话
  c.send('1'); await c.waitFor('南京')              // 赴任（flags.hushi.tookPost）
  c.send('1'); await c.waitFor('总统官邸')          // 「你就是逃兵」
  c.send('1'); await c.waitFor('送冬秀上船')        // 答应去（flags.hushi.willGo）
  c.send('1'); await c.waitFor('一张破纸')          // 送她上船，你留下
  c.send('1'); await c.waitFor('诤臣')              // 夹进书里（items.milk_receipt）
  c.send('1'); await c.waitFor('南港')              // 说，逆耳的话（flags.hushi.remonstrated）
}

const ROUTES = [
  {
    id: 'A', title: '情报 → 还价 → 胜利', ending: '结局 · 剑之认主',
    drive: async (c) => {
      // 导航统一用 choose（按选项文本，等同人类阅读后选择），避免场景刚渲染时
      // 过早发送序号被引擎判为「未识别」（首次实跑路线 A 在此偶发挂起，改 choose 后稳定）
      await c.choose('走进村庄'); await c.waitFor('十字路口')
      await c.choose('老猎人'); await c.waitFor('老猎人的木屋')
      await c.choose('前往官道'); await c.waitFor('青石大路')
      await c.choose('篷车'); await c.waitFor('篷车商人')
      await c.choose('还价'); await c.waitFor('古堡 · 大门')
      await c.choose('不买'); await c.waitFor('古堡 · 大门')
      await c.choose('亮出武器'); await c.waitFor('古堡 · 大厅')
      await c.choose('下地牢'); await c.waitFor('古堡 · 地牢')
      await c.fight('阶梯口')
      await c.choose('登上圣所'); await c.waitFor('古堡 · 圣所')
      await c.choose('举起你的剑'); await c.waitFor('结局 · 剑之认主')
      c.send('')
    },
  },
  {
    id: 'B', title: '战斗 → 断剑 → 胜利', ending: '结局 · 剑之认主',
    drive: async (c) => {
      c.send('2'); await c.waitFor('林间小路')
      c.send('1'); await c.waitFor('岔路深处')
      c.send('1'); await c.waitFor('狼穴')
      c.send('2'); await c.waitFor('老橡木酒馆')
      await c.choose('回十字路口'); await c.waitFor('十字路口')
      await c.choose('杂货铺'); await c.waitFor('杂货铺')
      await c.choose('买伤药'); await c.waitFor('effect hp: 12 -> 20')
      await c.choose('回十字路口'); await c.waitFor('十字路口')
      await c.choose('走官道大路'); await c.waitFor('青石大路')
      c.send('1'); await c.waitFor('篷车商人')
      await c.choose('不买'); await c.waitFor('古堡 · 大门')
      c.send('1'); await c.waitFor('古堡 · 大厅')
      await c.choose('下地牢'); await c.waitFor('古堡 · 地牢')
      await c.fight('阶梯口')
      await c.choose('登上圣所'); await c.waitFor('古堡 · 圣所')
      await c.choose('举起你的剑'); await c.waitFor('结局 · 剑之认主')
      c.send('')
    },
  },
  {
    id: 'D', title: '星港 DLC → 情报 → 通风管道 → 胜利', ending: '结局 · 数据核心',
    drive: async (c) => {
      await c.choose('登船前往第七星港'); await c.waitFor('星港 · 空港大厅')
      c.send('2'); await c.waitFor('★ 成就解锁：星际线人')
      c.send('1'); await c.waitFor('星港 · 空港大厅')
      c.send('1'); await c.waitFor('星港 · 货舱区')
      c.send('2'); await c.waitFor('结局 · 数据核心')
      c.send('quit')
    },
  },
  {
    id: 'E', title: '成就系统解锁与查看', ending: '[✓] 屠狼者',
    drive: async (c) => {
      c.send('2'); await c.waitFor('林间小路')
      c.send('1'); await c.waitFor('岔路深处')
      c.send('1'); await c.waitFor('★ 成就解锁：屠狼者')
      c.send('1'); await c.waitFor('青石大路')
      c.send('1'); await c.waitFor('篷车商人')
      c.send('2'); await c.waitFor('古堡 · 大门')
      c.send('achievements'); await c.waitFor('[✓] 屠狼者')
      c.send('quit')
    },
  },
  {
    id: 'H', title: '战斗系统 · 试炼场对局', endingOk: (o) => o.includes('你击败了独眼狼') || o.includes('你被独眼狼击倒'),
    drive: async (c) => {
      c.send('4'); await c.waitFor('⚔ 第 1 回合')
      for (let i = 0; i < 16; i++) {
        if (c.output().includes('你击败了独眼狼') || c.output().includes('你被独眼狼击倒')) break
        c.send('a'); await sleep(350)
      }
      await c.waitFor('战利品') || await c.waitFor('试炼场之殇')
      c.send('quit')
    },
  },
  {
    id: 'J', title: '战斗中命令拦截与退出', endingOk: (o) => o.includes('战斗中不可用：xyzzy'),
    drive: async (c) => {
      c.send('4'); await c.waitFor('⚔ 第 1 回合')
      c.send('a'); await c.waitFor('第 2 回合')
      c.send('stats'); await c.waitFor('ATK')
      c.send('achievements'); await c.waitFor('屠狼者')
      c.send('xyzzy'); await c.waitFor('战斗中不可用：xyzzy')
      c.send('quit')
    },
  },
  {
    id: 'O', title: '古堡探索 → 壁画 → 藏书阁 → BEST END', ending: '结局 · 完整的剑',
    drive: async (c) => {
      c.send('2'); await c.waitFor('林间小路')
      c.send('1'); await c.waitFor('岔路深处')
      c.send('1'); await c.waitFor('狼穴')
      c.send('2'); await c.waitFor('老橡木酒馆')
      await c.choose('回十字路口'); await c.waitFor('十字路口')
      await c.choose('杂货铺'); await c.waitFor('杂货铺')
      await c.choose('买伤药'); await c.waitFor('effect hp: 12 -> 20')
      await c.choose('回十字路口'); await c.waitFor('十字路口')
      await c.choose('走官道大路'); await c.waitFor('青石大路')
      c.send('1'); await c.waitFor('篷车商人')
      await c.choose('不买'); await c.waitFor('古堡 · 大门')
      await c.choose('亮出武器'); await c.waitFor('古堡 · 大厅')
      await c.choose('细看壁画'); await c.waitFor('大厅 · 壁画')
      await c.choose('记在心里'); await c.waitFor('古堡 · 大厅')
      await c.choose('推开右手的门'); await c.waitFor('藏书阁')
      await c.choose('把手记读完'); await c.waitFor('effect flags.swordLore: undefined -> true')
      await c.choose('去圣所'); await c.waitFor('古堡 · 地牢')
      await c.fight('阶梯口')
      await c.choose('登上圣所'); await c.waitFor('古堡 · 圣所')
      await c.choose('让它们合二为一'); await c.waitFor('结局 · 完整的剑')
      c.send('quit')
    },
  },
  {
    id: 'P', title: '商人结局 · 持剑退出', ending: '结局 · 好价钱',
    drive: async (c) => {
      c.send('3'); await c.waitFor('青石大路')
      c.send('1'); await c.waitFor('篷车商人')
      await c.choose('十枚金币，成交'); await c.waitFor('effect items.rusty_sword: undefined -> 1')
      await c.choose('不买'); await c.waitFor('古堡 · 大门')
      await c.choose('亮出武器'); await c.waitFor('古堡 · 大厅')
      await c.choose('下地牢'); await c.waitFor('古堡 · 地牢')
      await c.fight('阶梯口')
      await c.choose('登上圣所'); await c.waitFor('古堡 · 圣所')
      await c.choose('悄悄退回去'); await c.waitFor('结局 · 好价钱')
      c.send('quit')
    },
  },
  {
    id: 'Q', title: '侦探线 · 充分调查 → 真结局', ending: '结局 · 真凶归案',
    drive: async (c) => {
      await c.choose('登船前往第七星港'); await c.waitFor('星港 · 空港大厅')
      await c.choose('招人查一桩命案'); await c.waitFor('一桩委托')
      await c.choose('接下委托'); await c.waitFor('案卷桌')
      const inv = async (kw, ev) => { await c.choose(kw); await c.waitFor(ev); c.send('1'); await c.waitFor('推理进度'); await sleep(300) }
      await inv('去码头现场', '海藻粉')
      await inv('进入死者舱室', '体检报告')
      await inv('调阅航行日志', '墨色')
      await inv('调阅货物清单', '替他签了')
      await inv('问话：船长', '排练过')
      await c.waitFor('推理进度 5/7')
      await c.choose('拼一拼'); await c.waitFor('推理台 · 拼合')
      await c.choose('比对货物清单与航行日志'); await c.waitFor('effect suspectLevel: 5 -> 6')
      await c.choose('去指认'); await c.waitFor('指控')
      await c.choose('摆出清单、日志与欠债'); await c.waitFor('结局 · 真凶归案')
      c.send('quit')
    },
  },
  {
    id: 'R', title: '侦探线 · 证据不足 → 冤案', ending: '结局 · 冤案',
    drive: async (c) => {
      await c.choose('登船前往第七星港'); await c.waitFor('星港 · 空港大厅')
      await c.choose('招人查一桩命案'); await c.waitFor('一桩委托')
      await c.choose('接下委托'); await c.waitFor('案卷桌')
      await c.choose('去码头现场'); await c.waitFor('海藻粉')
      await c.choose('回案卷桌'); await c.waitFor('推理进度')
      await c.choose('指认凶手'); await c.waitFor('指控')
      await c.choose('手上还撑不住'); await c.waitFor('结局 · 冤案')
      c.send('quit')
    },
  },
  {
    id: 'S-KING', title: '商队 · 国王线（走私→办牌照→大宗买卖）', ending: '结局 · 商队之王',
    drive: async (c) => {
      await c.choose('加入一支荒漠商队'); await c.waitFor('商队营地')
      await c.choose('去北边黑市'); await c.waitFor('北边 · 黑市')
      await c.choose('接下走私的活'); await c.waitFor('effect gold: 10 -> 40')
      await c.choose('去西边沙丘探路'); await c.waitFor('西边 · 沙丘')
      await c.choose('继续往沙丘深处走'); await c.waitFor('沙丘 · 盗匪')
      await c.fight('击退沙盗')
      await c.choose('回营地'); await c.waitFor('商队营地')
      await c.choose('去南边贸易站'); await c.waitFor('南边 · 贸易站')
      await c.choose('花 20 金办一张贸易牌照'); await c.waitFor('effect flags.tradeLicense')
      await c.choose('做最后的决断'); await c.waitFor('最后的决断')
      await c.choose('凭贸易许可证'); await c.waitFor('结局 · 商队之王')
      c.send('quit')
    },
  },
  {
    id: 'S-HERMIT', title: '商队 · 隐者线（善举→分金）', ending: '结局 · 绿洲隐者',
    drive: async (c) => {
      await c.choose('加入一支荒漠商队'); await c.waitFor('商队营地')
      await c.choose('收留路过的难民'); await c.waitFor('路过的难民')
      await c.choose('收留他们过夜'); await c.waitFor('effect karma: 0 -> 1')
      await c.choose('去东边绿洲休整'); await c.waitFor('东边 · 绿洲')
      await c.choose('出钱买水，也分一口给路过的穷人'); await c.waitFor('effect karma: 1 -> 2')
      await c.choose('做最后的决断'); await c.waitFor('最后的决断')
      await c.choose('把赚的钱分给一路帮过你的人'); await c.waitFor('结局 · 绿洲隐者')
      c.send('quit')
    },
  },
  {
    id: 'S-BROKE', title: '商队 · 散伙线', ending: '结局 · 商队散伙',
    drive: async (c) => {
      await c.choose('加入一支荒漠商队'); await c.waitFor('商队营地')
      await c.choose('做最后的决断'); await c.waitFor('最后的决断')
      await c.choose('什么也不留恋，商队散伙'); await c.waitFor('结局 · 商队散伙')
      c.send('quit')
    },
  },
  {
    id: 'T-RECON', title: '经营 · 侦察→条件隐藏→开张', endingOk: (o) => o.includes('东市 · 第 1 天'),
    drive: async (c) => {
      await c.choose('去东市盘下一间铺子'); await c.waitFor('三合铺')
      await c.choose('先不急着开张'); await c.waitFor('东市 · 市面')
      await c.choose('进茶馆听茶客闲谈'); await c.waitFor('东市 · 茶馆')
      await c.choose('记下茶会的日子'); await c.waitFor('东市 · 市面')
      await c.choose('回铺子开张'); await c.waitFor('东市 · 第 1 天')
      c.send('quit')
    },
  },
  {
    id: 'T-PROSPER', title: '经营 · 发家（GOOD END）', ending: '结局 · 东市 · 商会入主',
    drive: async (c) => {
      await c.choose('去东市盘下一间铺子'); await c.waitFor('三合铺')
      await c.choose('接过铺子，先开张试试'); await c.waitFor('东市 · 第 1 天')
      c.send('buy cloth 15'); await c.waitFor('库存 15')
      for (let i = 0; i < 4; i++) c.send('next')
      await c.waitFor('东市 · 第 5 天')
      c.send('sell cloth'); await c.waitFor('+90 金')
      c.send('next'); await c.waitFor('收市盘账')
      await c.choose('请何掌柜裁断'); c.send('1')
      await c.waitFor('结局 · 东市 · 商会入主')
      c.send('quit')
    },
  },
  {
    id: 'T-NEUTRAL', title: '经营 · 糊口（NEUTRAL END）', ending: '结局 · 东市 · 小本营生',
    drive: async (c) => {
      await c.choose('去东市盘下一间铺子'); await c.waitFor('三合铺')
      await c.choose('接过铺子，先开张试试'); await c.waitFor('东市 · 第 1 天')
      c.send('buy cloth 5'); await c.waitFor('库存 5')
      for (let i = 0; i < 4; i++) c.send('next')
      await c.waitFor('东市 · 第 5 天')
      c.send('sell cloth'); await c.waitFor('+30 金')
      c.send('next'); await c.waitFor('收市盘账')
      await c.choose('请何掌柜裁断'); c.send('1')
      await c.waitFor('结局 · 东市 · 小本营生')
      c.send('quit')
    },
  },
  {
    id: 'T-BANKRUPT', title: '经营 · 破产（BAD END）', ending: '结局 · 东市 · 铺子没保住',
    drive: async (c) => {
      await c.choose('去东市盘下一间铺子'); await c.waitFor('三合铺')
      await c.choose('接过铺子，先开张试试'); await c.waitFor('东市 · 第 1 天')
      for (let i = 0; i < 5; i++) c.send('next')
      await c.waitFor('收市盘账')
      await c.choose('请何掌柜裁断'); c.send('1')
      await c.waitFor('结局 · 东市 · 铺子没保住')
      c.send('quit')
    },
  },
  {
    id: 'U', title: '武侠刀客 · 了结结局', ending: '结局 · 刀客 · 了结',
    drive: async (c) => {
      await c.choose('听一段旧江湖'); await c.waitFor('风陵渡 · 客栈')
      await c.choose('向商队问清'); await c.waitFor('北山 · 官道')
      await c.choose('拔刀，管这一桩'); await c.waitFor('北山 · 山贼')
      await c.fight('驴车旁')
      await c.choose('继续赶路'); await c.waitFor('北山 · 古庙')
      await c.choose('与我何干'); await c.waitFor('北山 · 断崖')
      await c.choose('堂堂正正一战'); await c.waitFor('断崖 · 雪')
      await c.fight('断崖 · 雪')
      c.send('1'); await c.waitFor('结局 · 刀客 · 了结')
      c.send('quit')
    },
  },
  {
    id: 'V', title: '科幻 · 空间站疑云 → 重启结局', ending: '结局 · 远望七号 · 重启',
    drive: async (c) => {
      await c.choose('醒在一座空间站'); await c.waitFor('远望七号 · 维修舱')
      await c.choose('去核心舱'); await c.waitFor('远望七号 · 核心舱')
      await c.choose('调取夜枭'); await c.waitFor('effect sciEvidence: 0 -> 1')
      await c.choose('去实验室'); await c.waitFor('远望七号 · 实验室')
      await c.choose('收起录音笔'); await c.waitFor('effect sciEvidence: 1 -> 2')
      await c.choose('去核心舱'); await c.waitFor('远望七号 · 核心舱')
      await c.choose('去舰桥'); await c.waitFor('远望七号 · 舰桥')
      await c.choose('拷贝呼叫记录'); await c.waitFor('effect sciEvidence: 2 -> 3')
      await c.choose('去核心舱'); await c.waitFor('远望七号 · 核心舱')
      await c.choose('呼叫夜枭'); await c.waitFor('远望七号 · 夜枭')
      await c.choose('拒绝它'); await c.waitFor('远望七号 · 抉择')
      await c.choose('切断夜枭主控'); await c.waitFor('结局 · 远望七号 · 重启')
      c.send('quit')
    },
  },
  {
    id: 'W', title: '恐怖 · 古宅惊魂 → 天亮结局', ending: '结局 · 古宅 · 天亮',
    drive: async (c) => {
      await c.choose('误入雨夜'); await c.waitFor('夜路 · 古宅')
      await c.choose('拿起蜡烛'); await c.waitFor('古宅 · 大堂')
      await c.choose('上楼看看'); await c.waitFor('古宅 · 阁楼')
      await c.choose('翻其他箱子'); await c.waitFor('effect horrorEvidence: 0 -> 1')
      await c.choose('回大堂'); await c.waitFor('古宅 · 大堂')
      await c.choose('推开东厢房'); await c.waitFor('古宅 · 东厢房')
      await c.choose('收起日记'); await c.waitFor('effect horrorEvidence: 1 -> 2')
      await c.choose('回大堂'); await c.waitFor('古宅 · 大堂')
      await c.choose('去西边的厨房'); await c.waitFor('古宅 · 厨房')
      await c.choose('拿上蜡烛'); await c.choose('推后门'); await c.waitFor('古宅 · 后门')
      await c.choose('沿着回廊走到底'); await c.waitFor('古宅 · 回廊尽头')
      await c.choose('吹灭它'); await c.waitFor('结局 · 古宅 · 天亮')
      c.send('quit')
    },
  },
  {
    id: 'X', title: '跨包彩蛋 · 商队铜符 → 东市识货人', endingOk: (o) => o.includes('铜符') && /effect gold/.test(o),
    drive: async (c) => {
      await c.choose('加入一支荒漠商队'); await c.waitFor('商队营地')
      await c.choose('去西边沙丘探路'); await c.waitFor('西边 · 沙丘')
      await c.choose('记下这条秘道'); await c.waitFor('商队营地')
      await c.choose('去找废弃的石堡遗迹'); await c.waitFor('古商道 · 遗迹')
      await c.choose('把铜符收进怀里'); await c.waitFor('商队营地')
      await c.choose('去东市寻识货人'); await c.waitFor('三合铺')
      await c.choose('先不急着开张'); await c.waitFor('东市 · 市面')
      await c.choose('回铺子开张'); await c.waitFor('东市 · 第 1 天')
      for (let i = 0; i < 5; i++) c.send('next')
      await c.waitFor('收市盘账')
      await c.choose('把荒漠带回来的铜符'); await c.waitFor('东市 · 铜符')
      await c.choose('卖了它'); await c.waitFor('effect gold')
      c.send('quit')
    },
  },
  // ── Phase 4 新线转录（与 e2e 路线 Y/Z/AA/BB 对应，每个结局一条 route）──
  {
    id: 'Y1', title: '子夜集 · 三夜破局 → 雾散还人', ending: '结局 · 雾散·还人',
    drive: async (c) => {
      await loopThreeNights(c)
      await c.choose('抢上前'); await c.waitFor('结局 · 雾散·还人')
      c.send('quit')
    },
  },
  {
    id: 'Y2', title: '子夜集 · 火焚神龛 → 一了百了', ending: '结局 · 一了百了',
    drive: async (c) => {
      await loopThreeNights(c)
      await c.choose('火折子'); await c.waitFor('结局 · 一了百了')
      c.send('quit')
    },
  },
  {
    id: 'Y3', title: '子夜集 · 自缚引魈 → 夜行人', ending: '结局 · 夜行人',
    drive: async (c) => {
      await loopThreeNights(c)
      await c.choose('换个活的'); await c.waitFor('结局 · 夜行人')
      c.send('quit')
    },
  },
  {
    id: 'Y4', title: '子夜集 · 六夜未破 → 第七夜', ending: '结局 · 第七夜',
    drive: async (c) => {
      await c.choose('听雨'); await c.waitFor('夜路 · 听雨客店')
      await c.choose('躺下'); await c.waitFor('第 1 个夜晚')
      for (let n = 1; n <= 5; n++) { await c.choose('睡去'); await c.waitFor(`第 ${n + 1} 个夜晚`) }
      await c.choose('任它来'); await c.waitFor('结局 · 第七夜')
      c.send('quit')
    },
  },
  {
    id: 'Z1', title: '驿路 · 劝留垫药 → 留灯', ending: '结局 · 留灯',
    drive: async (c) => {
      await c.choose('大雪封路'); await c.waitFor('雪路 · 青泥驿')
      await c.choose('推门进去'); await c.waitFor('青泥驿 · 大堂')
      await c.choose('灯边坐下'); await c.waitFor('晚膳 · 粗茶淡饭')
      await c.choose('那只碗'); await c.waitFor('檐下 · 夜谈')
      await c.choose('劝她留下'); await c.waitFor('次日 · 晨')
      await c.choose('药钱我垫'); await c.waitFor('午后 · 柴房')
      await c.choose('她该知道'); await c.waitFor('辞行 · 灯下')
      await c.choose('我来添油'); await c.waitFor('结局 · 留灯')
      c.send('quit')
    },
  },
  {
    id: 'Z2', title: '驿路 · 许诺同行 → 出关', ending: '结局 · 出关',
    drive: async (c) => {
      await c.choose('大雪封路'); await c.waitFor('雪路 · 青泥驿')
      await c.choose('推门进去'); await c.waitFor('青泥驿 · 大堂')
      await c.choose('灯边坐下'); await c.waitFor('晚膳 · 粗茶淡饭')
      await c.choose('那只碗'); await c.waitFor('檐下 · 夜谈')
      await c.choose('劝她出去看看'); await c.waitFor('次日 · 晨')
      await c.choose('我带你去看看'); await c.waitFor('午后 · 山脊')
      await c.choose('算。明早天亮'); await c.waitFor('辞行 · 灯下')
      await c.choose('我答应过带你走'); await c.waitFor('结局 · 出关')
      c.send('quit')
    },
  },
  {
    id: 'Z3', title: '驿路 · 全程冷 → 结局·冷', ending: '结局 · 冷',
    drive: async (c) => {
      await c.choose('大雪封路'); await c.waitFor('雪路 · 青泥驿')
      await c.choose('推门进去'); await c.waitFor('青泥驿 · 大堂')
      await c.choose('灯边坐下'); await c.waitFor('晚膳 · 粗茶淡饭')
      await c.choose('不问。出门在外'); await c.waitFor('檐下 · 夜谈')
      await c.choose('只是听着'); await c.waitFor('次日 · 晨')
      await c.choose('当作没看见'); await c.waitFor('第三日 · 雪霁')
      await c.choose('辞行'); await c.waitFor('辞行 · 灯下')
      await c.choose('锁钱匣'); await c.waitFor('结局 · 冷')
      c.send('quit')
    },
  },
  {
    id: 'AA1', title: '江畔县志 · 三铁证 → 铁证定谳', ending: '结局 · 铁证定谳',
    drive: async (c) => {
      await c.choose('江畔捞起画工的浮尸'); await c.waitFor('临江 · 采石矶')
      await c.choose('识得几个'); await c.waitFor('查案 · 临江县城')
      await c.choose('孙鹤年的医馆'); await c.waitFor('孙鹤年 · 医馆')
      await c.choose('验尸定论'); await c.waitFor('查案 · 临江县城')
      await c.choose('城南药铺'); await c.waitFor('回春药铺')
      await c.choose('砒霜凭县衙条子'); await c.waitFor('查案 · 临江县城')
      await c.choose('画室旧居'); await c.waitFor('陈砚秋 · 画室')
      await c.choose('暗格账页'); await c.waitFor('查案 · 临江县城')
      await c.choose('击鼓鸣冤'); await c.waitFor('临江县 · 大堂')
      await c.choose('当堂亮出实证'); await c.waitFor('结局 · 铁证定谳')
      c.send('quit')
    },
  },
  {
    id: 'AA2', title: '江畔县志 · 无证指里正 → 冤狱', endingOk: (o) => o.includes('赵存礼被判了斩监候'),
    drive: async (c) => {
      await c.choose('江畔捞起画工的浮尸'); await c.waitFor('临江 · 采石矶')
      await c.choose('识得几个'); await c.waitFor('查案 · 临江县城')
      await c.choose('孙鹤年的医馆'); await c.waitFor('孙鹤年 · 医馆')
      await c.choose('验尸定论'); await c.waitFor('查案 · 临江县城')
      await c.choose('击鼓鸣冤'); await c.waitFor('临江县 · 大堂')
      await c.choose('指着里正赵存礼'); await c.waitFor('大堂 · 指认赵存礼')
      await c.choose('咬死不放'); await c.waitFor('结局 · 冤狱')
      c.send('quit')
    },
  },
  {
    id: 'BB1', title: '武侠 · 迷粉取胜 → 结局·毒', ending: '结局 · 刀客 · 毒',
    drive: async (c) => {
      await c.choose('听一段旧江湖'); await c.waitFor('风陵渡 · 客栈')
      await c.choose('先上街置办'); await c.waitFor('风陵渡 · 药铺')
      await c.choose('买下解药'); await c.waitFor('风陵渡 · 街口')
      await c.choose('出城，上北山'); await c.waitFor('北山 · 古庙')
      await c.choose('与我何干'); await c.waitFor('北山 · 断崖')
      await c.choose('撒出在药铺配的迷粉'); await c.waitFor('北山 · 断崖对决')
      await c.fight('断崖 · 雪')
      c.send('1') // 两同文本选项互斥：dirtyFight → 毒结局在首项
      await c.waitFor('结局 · 刀客 · 毒')
      c.send('quit')
    },
  },
  {
    id: 'BB2', title: '空间站疑云 · 弃站求援', ending: '结局 · 远望七号 · 弃站',
    drive: async (c) => {
      await c.choose('醒在一座空间站'); await c.waitFor('远望七号 · 维修舱')
      await c.choose('去核心舱'); await c.waitFor('远望七号 · 核心舱')
      await c.choose('调取夜枭'); await c.choose('去实验室'); await c.waitFor('远望七号 · 实验室')
      await c.choose('收起录音笔'); await c.choose('去核心舱'); await c.waitFor('远望七号 · 核心舱')
      await c.choose('去舰桥'); await c.waitFor('远望七号 · 舰桥')
      await c.choose('拷贝呼叫记录'); await c.choose('去核心舱'); await c.waitFor('远望七号 · 核心舱')
      await c.choose('呼叫夜枭'); await c.waitFor('远望七号 · 夜枭')
      await c.choose('拒绝它'); await c.waitFor('远望七号 · 抉择')
      await c.choose('救生舱'); await c.waitFor('结局 · 远望七号 · 弃站')
      c.send('quit')
    },
  },
  {
    id: 'BB3', title: '古宅惊魂 · 交出蜡烛 → 宅主', ending: '结局 · 古宅 · 宅主',
    drive: async (c) => {
      await c.choose('误入雨夜'); await c.waitFor('夜路 · 古宅')
      await c.choose('拿起蜡烛'); await c.waitFor('古宅 · 大堂')
      await c.choose('去西边的厨房'); await c.waitFor('古宅 · 厨房')
      await c.choose('拿上蜡烛'); await c.choose('推后门'); await c.waitFor('古宅 · 后门')
      await c.choose('沿着回廊走到底'); await c.waitFor('古宅 · 回廊尽头')
      await c.choose('把蜡烛给它'); await c.waitFor('结局 · 古宅 · 宅主')
      c.send('quit')
    },
  },
  {
    id: 'BB4', title: '古宅惊魂 · 转身逃跑 → 烛灭', ending: '结局 · 古宅 · 烛灭',
    drive: async (c) => {
      await c.choose('误入雨夜'); await c.waitFor('夜路 · 古宅')
      await c.choose('拿起蜡烛'); await c.waitFor('古宅 · 大堂')
      await c.choose('去西边的厨房'); await c.waitFor('古宅 · 厨房')
      await c.choose('拿上蜡烛'); await c.choose('推后门'); await c.waitFor('古宅 · 后门')
      await c.choose('沿着回廊走到底'); await c.waitFor('古宅 · 回廊尽头')
      await c.choose('转身就跑'); await c.waitFor('结局 · 古宅 · 烛灭')
      c.send('quit')
    },
  },
  {
    id: 'BB5', title: '星港第二案 · 六证指认 → 真相', ending: '结局 · 连环案 · 真相',
    drive: async (c) => {
      await c.choose('登船前往第七星港'); await c.waitFor('星港 · 空港大厅')
      await c.choose('港务官中毒案'); await c.waitFor('星港 · 第二桩委托')
      await c.choose('接下委托'); await c.waitFor('调查板 · 证据 0/8')
      await c.choose('医务室'); await c.waitFor('勘查 · 医务室')
      await c.choose('杯口红痕'); await c.waitFor('调查板 · 证据 1/8')
      await c.choose('港务官办公室'); await c.waitFor('勘查 · 港务官办公室')
      await c.choose('回批'); await c.waitFor('调查板 · 证据 2/8')
      await c.choose('值更记录'); await c.waitFor('档案 · 值更记录')
      await c.choose('时间线'); await c.waitFor('调查板 · 证据 3/8')
      await c.choose('问话：大副'); await c.waitFor('问话 · 大副')
      await c.choose('乌头碱'); await c.waitFor('调查板 · 证据 4/8')
      await c.choose('问话：医生'); await c.waitFor('问话 · 医生')
      await c.choose('拿乌头碱'); await c.waitFor('调查板 · 证据 5/8')
      await c.choose('问话：船长'); await c.waitFor('问话 · 船长')
      await c.choose('推杯子'); await c.waitFor('调查板 · 证据 6/8')
      await c.choose('指认'); await c.waitFor('指控 · 第二案')
      await c.choose('船长袖手旁观'); await c.waitFor('结局 · 连环案 · 真相')
      c.send('quit')
    },
  },
  {
    id: 'BB6', title: '古堡 · 封印钥匙 → 献祭封剑', ending: '结局 · 献祭',
    drive: async (c) => {
      await c.waitFor('村庄 · 晨雾')
      c.send('2'); await c.waitFor('林间小路')
      c.send('1'); await c.waitFor('岔路深处')
      c.send('1'); await c.waitFor('狼穴')
      c.send('2'); await c.waitFor('老橡木酒馆')
      await c.choose('回十字路口'); await c.waitFor('十字路口')
      await c.choose('杂货铺'); await c.waitFor('杂货铺')
      await c.choose('买伤药'); await c.waitFor('effect hp: 12 -> 20')
      await c.choose('回十字路口'); await c.waitFor('十字路口')
      await c.choose('走官道大路'); await c.waitFor('青石大路')
      c.send('1'); await c.waitFor('篷车商人')
      await c.choose('不买'); await c.waitFor('古堡 · 大门')
      await c.choose('亮出武器'); await c.waitFor('古堡 · 大厅')
      await c.choose('细看壁画'); await c.waitFor('大厅 · 壁画')
      await c.choose('记在心里'); await c.waitFor('古堡 · 大厅')
      await c.choose('推开右手的门'); await c.waitFor('藏书阁')
      await c.choose('把手记读完'); await c.waitFor('effect flags.swordLore: undefined -> true')
      await c.choose('去圣所'); await c.waitFor('古堡 · 地牢')
      await c.fight('阶梯口')
      await c.choose('钻'); await c.waitFor('地下层 · 裂缝')
      await c.choose('往右走'); await c.waitFor('地下层 · 管家室')
      await c.choose('需要了结'); await c.waitFor('管家室 · 了结')
      await c.choose('记下'); await c.choose('怎么封'); await c.waitFor('管家室 · 封剑之法')
      await c.choose('接过钥匙'); await c.waitFor('地下层 · 管家室')
      await c.choose('离开管家室'); await c.waitFor('地下层 · 裂缝')
      await c.choose('回阶梯口'); await c.waitFor('阶梯口')
      await c.choose('登上圣所'); await c.waitFor('古堡 · 圣所')
      await c.choose('封印钥匙插入底座'); await c.waitFor('结局 · 献祭')
      c.send('quit')
    },
  },
  {
    id: 'DD1', title: '藏晖室札记 · 五幕主线 → 真结局', ending: '结局 · 过五关',
    drive: async (c) => {
      await driveHushiToFinale(c)
      // ⚠️ 终局按关键词选，不用编号：cards 的选项带 if 条件，可见数量随状态浮动
      // （首次实现用 send('1')/send('2')，插入新条件选项后编号即错位）
      await c.choose('再摆一次')         // 用地牌做「配」
      await c.waitFor('结局 · 过五关')
      c.send('quit')
    },
  },
  {
    id: 'DD2', title: '藏晖室札记 · 五幕主线 → 诤臣', ending: '结局 · 诤臣一百人',
    drive: async (c) => {
      await driveHushiToFinale(c)
      await c.choose('大失望，大失望')   // 「你想说的其实只有六个字」
      await c.waitFor('结局 · 诤臣一百人')
      c.send('quit')
    },
  },
]

// ---------------------------------------------------------------------------
// 生成路线：由 scripts/gen-routes.mjs 从 tests/e2e.mjs 的实测序列抽取
// （内容扩充到 39 包 / 135 结局后，手写路线仍停在 M14 之前，新内容靠这里补齐）
// 步骤是数据（wait 场景标题 / pick 选项文本 / send 原始命令），重跑生成器即可同步。
// ---------------------------------------------------------------------------
const GEN_FILE = join(root, 'scripts', 'routes.generated.json')
function loadGeneratedRoutes() {
  if (!existsSync(GEN_FILE)) return []
  try {
    const j = JSON.parse(readFileSync(GEN_FILE, 'utf8'))
    return (j.routes ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      ending: r.ending,
      generated: true,
      drive: async (c) => {
        for (const s of r.steps) {
          if (s.wait) await c.waitFor(s.wait, 15000)
          if (s.pick) await c.choose(s.pick)
          if (s.send) c.send(s.send)
        }
        c.send('quit')
      },
    }))
  } catch (e) {
    console.error(`⚠ 生成路线载入失败（${e.message}），本次只跑手写路线`)
    return []
  }
}

const GENERATED = loadGeneratedRoutes()
const ALL_ROUTES = [...ROUTES, ...GENERATED]

// --list-routes：只打印全部路线 id（JSON），供 scripts/auto-playthrough.mjs 动态取清单
if (process.argv.includes('--list-routes')) {
  console.log(JSON.stringify(ALL_ROUTES.map((r) => r.id)))
  process.exit(0)
}

// ---------------------------------------------------------------------------
// C：存档 / 读档（两个进程）
// ---------------------------------------------------------------------------
async function runSaveLoad(env) {
  const g1 = launch({ env }); const c1 = makeCtrl(g1)
  await c1.waitFor('村庄 · 晨雾')
  c1.send('2'); await c1.waitFor('林间小路')
  c1.send('save a'); await c1.waitFor('已保存到存档位 a')
  await sleep(500)
  c1.send('quit'); await c1.exit()
  const g2 = launch({ env }); const c2 = makeCtrl(g2)
  await c2.waitFor('村庄 · 晨雾')
  c2.send('load a')
  let ok = await c2.waitFor('已读取存档位 a（场景: forest）', 5000)
  if (!ok) { c2.send('load a'); ok = await c2.waitFor('已读取存档位 a（场景: forest）', 5000) }
  await c2.waitFor('林间小路')
  c2.send('quit'); await c2.exit()
  const transcript = c1.stdout() + '\n\n──────────── 重新启动并读档 ────────────\n\n' + c2.stdout()
  const status = (c2.stdout().includes('已读取存档位 a（场景: forest）') && c2.stdout().includes('林间小路')) ? 'OK' : 'FAIL'
  return { id: 'C', title: '存档 → 退出 → 重启 → 读档', status, detail: status === 'OK' ? '存档落盘、重启后恢复 forest 场景' : '读档失败', transcript, seq: [...c1.seq, '（重启）', ...c2.seq] }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
const sfxDir = mkdtempSync(join(tmpdir(), 'dse-playthrough-'))
const env = { DSE_SFX_DIR: sfxDir }
const results = []

// 调试用：--only=DD1,DD2 只跑指定路线（全量约 9 分钟，调单条时不必等）。
// 默认行为不变（跑全部 + 存档路线 + 写转录文件）。
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean) : null
const routes = only ? ALL_ROUTES.filter((r) => only.includes(r.id)) : ALL_ROUTES
if (only) console.log(`（--only 模式：只跑 ${routes.map((r) => r.id).join(', ')}）`)

for (const route of routes) {
  const g = launch({ env }); const c = makeCtrl(g)
  let status = 'OK', detail = ''
  try {
    await c.waitFor('村庄 · 晨雾', 10000)
    await route.drive(c)
    const res = await c.exit(45000)
    const stderr = (c.stderr() || '').trim()
    if (!(res.ok && res.code === 0)) { status = 'FAIL'; detail = `退出码=${res.code} ${res.reason ?? ''}` }
    else if (stderr !== '') { status = 'WARN'; detail = 'stderr 非空（见转录尾部）' }
    const reached = route.endingOk ? route.endingOk(c.stdout()) : c.stdout().includes(route.ending)
    if (!reached) { status = 'FAIL'; detail = (detail ? detail + '；' : '') + `未到达结局「${route.ending ?? '(自定义)'}]` }
  } catch (e) {
    status = 'FAIL'; detail = e.message; try { g.kill() } catch {}
  }
  results.push({ id: route.id, title: route.title, status, detail, transcript: c.stdout(), seq: c.seq })
  console.log(`${status === 'OK' ? '✔' : status === 'WARN' ? '⚠' : '✘'} 路线 ${route.id} ${route.title} ${detail ? '— ' + detail : ''}`)
}

const cRes = await runSaveLoad(env)
results.push(cRes)
console.log(`${cRes.status === 'OK' ? '✔' : '✘'} 路线 ${cRes.id} ${cRes.title} ${cRes.detail ? '— ' + cRes.detail : ''}`)

// 清理音效临时目录
try { rmSync(sfxDir, { recursive: true, force: true }) } catch {}

// ---------------------------------------------------------------------------
// 生成 Markdown 转录
// ---------------------------------------------------------------------------
const okCount = results.filter((r) => r.status === 'OK').length
const warnCount = results.filter((r) => r.status === 'WARN').length
const failCount = results.filter((r) => r.status === 'FAIL').length

let md = `# dict-scene-engine 完整游戏流程实跑记录\n\n`
md += `**日期**：${DATE}\n`
md += `**版本**：git HEAD \`${GIT_HEAD}\` · tag \`${GIT_TAG}\`\n`
md += `**运行时**：Node ${NODE_VER}（\`node game.js\` 交互模式逐路线驱动）\n`
md += `**音效**：设 \`DSE_SFX_DIR\` 到本次运行唯一临时目录，运行结束清理；未静音，stdout 与玩家实跑一致\n`
md += `**路线数**：${results.length}（叙事/机制全路线）\n\n`

md += `## 📌 总览\n\n`
md += `| 结果 | 数量 |\n|------|------|\n| ✅ 通过 | ${okCount} |\n| ⚠️ 警告 | ${warnCount} |\n| ❌ 失败 | ${failCount} |\n\n`

md += `### 路线结果一览\n\n| 路线 | 标题 | 状态 | 说明 |\n|------|------|------|------|\n`
for (const r of results) {
  md += `| ${r.id} | ${r.title} | ${r.status === 'OK' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌'} | ${r.detail || '到达结局'} |\n`
}
md += `\n> 排除项（属验证程序而非玩家流程，已在 e2e 套件覆盖）：F 热重载改文件、G 音效文件生成、I 官方 HMR 改文件、K 存档安全、L 重放回归、M 退出竞态、N 内容校验器。\n\n`

for (const r of results) {
  md += `\n---\n\n## 路线 ${r.id} · ${r.title}\n\n`
  md += `**状态**：${r.status === 'OK' ? '✅ 通过' : r.status === 'WARN' ? '⚠️ 警告' : '❌ 失败'}${r.detail ? ' — ' + r.detail : ''}\n\n`
  md += `**输入序列**：${r.seq.join(' → ')}\n\n`
  md += `<剧情转录>\n\n\`\`\`\n${r.transcript.trim()}\n\`\`\`\n\n`
}

const projectDeliverable = join(root, 'deliverables', 'gstack')
const workspaceDeliverable = 'C:\\Users\\13122\\WorkBuddy\\2026-09-06-21-16-14\\deliverables\\gstack'
mkdirSync(projectDeliverable, { recursive: true })
mkdirSync(workspaceDeliverable, { recursive: true })
const fname = `full-playthrough-dict-scene-engine-${DATE}.md`
writeFileSync(join(projectDeliverable, fname), md, 'utf8')
try { writeFileSync(join(workspaceDeliverable, fname), md, 'utf8') } catch (e) { console.log('workspace 副本写入跳过：' + e.message) }

console.log(`\n转录已保存：${join(projectDeliverable, fname)}`)
console.log(`结果: ${okCount} 通过, ${warnCount} 警告, ${failCount} 失败`)
process.exit(failCount ? 1 : 0)

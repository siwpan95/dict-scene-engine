// CLI 模拟测试：spawn 真实 dse 进程，验证命令行接口的可用性与稳定性
// 运行：npm run test:cli（或 node tests/cli.mjs）
//
// 与 tests/e2e.mjs 的分工：
//   e2e.mjs —— 内容/引擎行为（交互式、管道输入）
//   cli.mjs —— 命令行接口（子命令、参数、退出码、脚本输入驱动）
// 两者都 spawn 真实进程，不 mock。

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
    if (output) console.log(`    ---- 实际输出 ----\n${output.slice(-800)}\n    ------------------`)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 运行一条 CLI 命令，返回 { stdout, stderr, code }
 * @param {string[]} args 不含 `node cli.js` 的参数
 * @param {{ timeout?: number, input?: string }} options
 */
function run(args, options = {}) {
  const { timeout = 15000 } = options
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, 'cli.js'), ...args], { cwd: root })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout)
    child.on('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code, signal })
    })
  })
}

console.log('CLI 模拟测试 —— dse 命令行接口\n')

// ---------- 1. help ----------
{
  console.log('[help] 帮助与用法')
  const r = await run(['help'])
  assert(r.code === 0, 'C1 help 退出码 0', r.stderr)
  assert(r.stdout.includes('dse play'), 'C2 帮助列出 play 命令')
  assert(r.stdout.includes('dse scenes') && r.stdout.includes('dse check'), 'C3 帮助列出 scenes/check 命令')
  assert(r.stdout.includes('--input'), 'C4 帮助说明 --input 脚本输入')
}

// ---------- 2. info ----------
{
  console.log('\n[info] 项目统计（只读，不启动主循环）')
  const r = await run(['info', '--json'])
  assert(r.code === 0, 'I1 info --json 退出码 0', r.stderr)
  let data = null
  try { data = JSON.parse(r.stdout) } catch (e) { /* 下面断言会失败并打印 */ }
  assert(data !== null, 'I2 info --json 输出合法 JSON', r.stdout.slice(-300))
  if (data) {
    assert(typeof data.scenes === 'number' && data.scenes >= 100, `I3 场景数合理（${data.scenes}）`)
    assert(data.chars > 0 && data.avgChars > 0, `I4 字数与均长有效（${data.chars} / ${data.avgChars}）`)
    assert(data.endings > 0, `I5 结局数有效（${data.endings}）`)
    assert(data.entry === 'start', `I6 入口为 start（${data.entry}）`)
    assert(Array.isArray(data.modes) && data.modes.includes('battle') && data.modes.includes('trade'),
      `I7 模式含 battle 与 trade（${data.modes?.join(',')}）`)
    assert(Array.isArray(data.packFiles) && data.packFiles.length === data.packs,
      `I8 packFiles 数量与 packs 一致（${data.packs}）`)
  }

  const rt = await run(['info'])
  assert(rt.code === 0 && rt.stdout.includes('场景'), 'I9 info 文本模式可用')
}

// ---------- 3. scenes ----------
{
  console.log('\n[scenes] 场景字典只读查询')
  const r = await run(['scenes', '--json'])
  let list = null
  try { list = JSON.parse(r.stdout) } catch (e) { /* ignore */ }
  assert(Array.isArray(list), 'S1 scenes --json 输出数组', r.stdout.slice(-300))
  if (list) {
    assert(list.length >= 100, `S2 列出全部场景（${list.length}）`)
    const endings = list.filter((s) => s.ending).length
    assert(endings > 0, `S3 标记出结局场景（${endings}）`)
    const modes = new Set(list.map((s) => s.mode))
    assert(modes.has('battle') && modes.has('trade'), `S4 模式覆盖 battle/trade（${[...modes].join(',')}）`)
    const start = list.find((s) => s.id === 'start')
    assert(start && start.choices > 0, 'S5 start 场景有选项')
  }

  const rs = await run(['scenes', '--scene', 'caravan.fork'])
  assert(rs.code === 0, 'S6 scenes --scene 退出码 0', rs.stderr)
  assert(rs.stdout.includes('最后的决断'), 'S7 显示指定场景标题')
  assert(rs.stdout.includes('ending.caravan-king'), 'S8 显示选项跳转目标')
  assert(rs.stdout.includes('if:'), 'S9 显示选项条件（便于内容调试）')

  const bad = await run(['scenes', '--scene', 'definitely-not-a-scene'])
  assert(bad.code === 1, 'S10 无效场景 ID 退出码非零')
  assert(bad.stderr.includes('不存在'), 'S11 无效场景给出明确错误信息', bad.stderr)
}

// ---------- 4. check ----------
{
  console.log('\n[check] 内容校验')
  const r = await run(['check'])
  assert(r.code === 0, 'K1 check 退出码 0（内容全绿）', r.stdout.slice(-300))
  assert(r.stdout.includes('无错误') || r.stdout.includes('✔'), 'K2 check 报告无错误')
}

// ---------- 5. play 脚本输入（核心：非交互驱动） ----------
{
  console.log('\n[play] 脚本输入非交互驱动')
  const r = await run(['play', '--input', '1', '--quiet'])
  assert(r.code === 0, 'P1 play 退出码 0（输入用尽自动 quit）', r.stderr)
  assert(r.stdout.includes('石桥村 · 十字路口'), 'P2 输入 1 流转到村庄场景')
  assert(r.stdout.includes('游戏已退出'), 'P3 输入用尽后走正常退出流程')
  assert(!r.stdout.includes('字 典 场 景 引 擎'), 'P4 --quiet 关闭启动横幅')
  assert(r.stdout.includes('>> 1'), 'P5 回显脚本输入（便于观察执行轨迹）')

  // 直达结局：恐怖篇入口(10) → 转身离开(2)
  const re = await run(['play', '--input', '10,2', '--quiet'])
  assert(re.code === 0, 'P6 直达结局退出码 0', re.stderr)
  assert(re.stdout.includes('结局 · 夜路 · 雨'), 'P7 脚本输入可跑到结局')

  // --entry 从指定场景起跑
  const rEntry = await run(['play', '--entry', 'caravan.camp', '--input', '1', '--quiet'])
  assert(rEntry.code === 0, 'P8 --entry 退出码 0', rEntry.stderr)
  assert(rEntry.stdout.includes('商队营地'), 'P9 --entry 从指定场景入场')
  assert(rEntry.stdout.includes('南边 · 贸易站'), 'P10 --entry 后输入生效')

  // 经营循环：验证了 CLI 能驱动 trade 模式（含带空格的命令）
  const seq = ['7', '1', 'buy cloth 15', 'next', 'next', 'next', 'next', 'sell cloth', 'next', '1', '1']
  const rt = await run(['play', '--input', seq.join(','), '--quiet'])
  assert(rt.code === 0, 'P11 经营循环退出码 0', rt.stderr)
  assert(rt.stdout.includes('东市 · 第 1 天'), 'P12 进入 trade 模式场景')
  assert(rt.stdout.includes('进货：布 ×15'), 'P13 经营命令 buy 生效')
  assert(rt.stdout.includes('结局 · 东市 · 商会入主'), 'P14 完整经营周目达成 GOOD END')

  // stats 命令在脚本序列中同样可用
  const rs2 = await run(['play', '--input', 'stats,quit', '--quiet'])
  assert(rs2.code === 0, 'P15 脚本中的引擎命令（stats）可用', rs2.stderr)
  assert(rs2.stdout.includes('HP') || rs2.stdout.includes('ATK'), 'P16 stats 输出状态')
}

// ---------- 6. saves ----------
{
  console.log('\n[saves] 存档位查询')
  const r = await run(['saves'])
  assert(r.code === 0, 'V1 saves 退出码 0', r.stderr)
  assert(r.stdout.includes('存档位') || r.stdout.includes('暂无存档'), 'V2 saves 输出存档列表或空提示')
}

// ---------- 7. 错误处理 ----------
{
  console.log('\n[error] 参数与错误处理')
  const bad = await run(['bogus-command'])
  assert(bad.code === 1, 'E1 未知命令退出码 1')
  assert(bad.stderr.includes('未知命令'), 'E2 stderr 给出未知命令提示')
  assert(bad.stderr.includes('用法'), 'E3 stderr 附带完整用法（不让人卡住）')
  assert(bad.stdout.trim() === '', 'E4 错误不污染 stdout（管道消费安全）')
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
process.exit(failed ? 1 : 0)

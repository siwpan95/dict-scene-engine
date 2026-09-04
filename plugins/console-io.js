// 终端 IO 适配器：把「输入/输出」抽象为 ctx.io 服务
// 换 UI（Web / Discord / TTS）时只需替换本插件，引擎与其他插件不动。
// 参考资料要点：插件是能力的独立单元，通过服务 key（ctx.io）解耦。
//
// 输入实现说明：不直接用 rl.question()（win32 管道下每行只返回首字符，
// 自动化测试/管道输入不可靠），改用 readline async iterator + 等待队列。

import { Service } from 'cordis'
import { createInterface } from 'node:readline'

export const name = 'io'

export class ConsoleIO extends Service {
  static inject = []

  constructor(ctx, config) {
    super(ctx, 'io')
    this.rl = null
    this.lines = []
    this.waiters = []
  }

  [Service.init]() {
    this.rl = createInterface({ input: process.stdin, output: process.stdout })
    // rl 关闭挂在根上下文的 effect 上 —— 确保任何时刻退出都能清理
    this.ctx.root.effect(() => () => this.rl?.close())

    // 后台泵：逐行读入，喂给等待中的 ask()；EOF 时放行所有等待者（空输入）
    ;(async () => {
      for await (const line of this.rl) {
        const waiter = this.waiters.shift()
        if (waiter) waiter.resolve(line.trim())
        else { this.lines.push(line.trim()) }
      }
      for (const waiter of this.waiters.splice(0)) waiter.resolve('')
    })().catch((error) => this.ctx.logger('io').error(error))
  }

  print(text = '') {
    process.stdout.write(String(text) + '\n')
  }

  /** 输出空行 */
  blank() {
    this.print('')
  }

  async ask(prompt = '> ') {
    process.stdout.write(prompt)
    if (this.lines.length) return this.lines.shift()
    return new Promise((resolve) => this.waiters.push({ resolve }))
  }

  /** 注入一条虚拟输入（热重载等场景用来打断等待、触发重渲染） */
  wake(text = '') {
    const waiter = this.waiters.shift()
    if (waiter) waiter.resolve(text)
    else this.lines.push(text)
  }
}

export default ConsoleIO

// 存档/读档插件 —— 演示「不改引擎代码，用事件扩展引擎能力」
//
// 做法：prepend 监听 engine/command（waterfall），在引擎默认处理器之前
// 拦截 save/load/slots 命令。这就是参考资料强调的插件化收益：
// 新能力 = 新插件 + 配置文件一行，核心代码零改动。

import { Service } from 'cordis'
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const name = 'save'

export class SaveService extends Service {
  static inject = ['state', 'engine', 'io']

  constructor(ctx, config) {
    super(ctx, 'save')
    this.config = config
    this.dir = join(process.cwd(), config.dir ?? './saves')
  }

  async [Service.init]() {
    await mkdir(this.dir, { recursive: true })
    // prepend: 抢在引擎默认处理器之前拿到输入
    this.ctx.on('engine/command', (line, choices, next) => this.handle(line, choices, next), { prepend: true })
  }

  async handle(line, choices, next) {
    const [command, ...rest] = line.split(/\s+/)
    switch (command?.toLowerCase()) {
      case 'save':
      case '存': {
        const slot = rest[0] ?? 'auto'
        await this.save(slot)
        this.ctx.io.print(`  已保存到存档位 ${slot}`)
        return { type: 'rerender' }
      }
      case 'load':
      case '读': {
        const slot = rest[0] ?? 'auto'
        const ok = await this.load(slot)
        return ok ? { type: 'scene', id: this.ctx.engine.current } : { type: 'rerender' }
      }
      case 'slots':
      case '档': {
        const list = await this.list()
        this.ctx.io.print(list.length ? `  存档位: ${list.join(', ')}` : '  （暂无存档）')
        return { type: 'rerender' }
      }
      default:
        return next()
    }
  }

  async save(slot) {
    const record = {
      slot,
      scene: this.ctx.engine.current,
      state: this.ctx.state.snapshot(),
      savedAt: new Date().toISOString(),
    }
    await writeFile(join(this.dir, `${slot}.json`), JSON.stringify(record, null, 2), 'utf8')
    this.ctx.emit('save/applied', slot, record)
    return record
  }

  async load(slot) {
    try {
      const raw = await readFile(join(this.dir, `${slot}.json`), 'utf8')
      const record = JSON.parse(raw)
      this.ctx.state.restore(record.state)
      this.ctx.engine.goto(record.scene)
      this.ctx.io.print(`  已读取存档位 ${slot}（场景: ${record.scene}）`)
      return true
    } catch (error) {
      this.ctx.io.print(`  读取存档 ${slot} 失败: ${error.code === 'ENOENT' ? '存档不存在' : error.message}`)
      return false
    }
  }

  async list() {
    const files = await readdir(this.dir)
    return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
  }
}

export default SaveService

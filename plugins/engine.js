// 引擎服务：字典场景解释器（游戏主循环）
//
// 事件驱动设计（其他插件可通过 ctx.on 扩展，无需改引擎代码）：
//   text/render     (waterfall) 文本渲染管道：插值 → 装饰，可层层包裹
//   engine/command  (waterfall) 输入命令分发：默认处理器匹配选项编号，
//                                其他插件 prepend 拦截自定义命令（如 save.js 的 存档/读档）
//   scene/enter     (emit)      进入场景后
//   scene/leave     (emit)      离开场景前
//   choice/made     (emit)      选项被选中、效果执行后
//   engine/start    (emit)      游戏开始
//   engine/end      (emit)      到达结局
//   engine/stop     (emit)      玩家退出
//
// 命令处理协议（engine/command 的返回值）：
//   { type: 'choice', index }  执行第 index 个选项
//   { type: 'scene', id }      直接跳转场景
//   { type: 'rerender' }       重新渲染当前场景（如存档成功后）
//   { type: 'quit' }           退出游戏
//   { type: 'nothing' }        未识别，重新渲染

import { Service } from 'cordis'

export const name = 'engine'

export class EngineService extends Service {
  static inject = ['scenes', 'state', 'io']

  constructor(ctx, config) {
    super(ctx, 'engine')
    this.config = config
    this.current = null
    this.running = false
  }

  [Service.init]() {
    // 用 setTimeout 让出 init：主循环不阻塞 loader，插件树全部就绪后才开局
    setTimeout(() => this.start(), 0)
  }

  /** 开始游戏（默认从配置的 entry 场景入场） */
  start(entryId = this.config.entry) {
    if (this.running) return
    this.running = true
    this.current = entryId
    this.ctx.emit('engine/start', entryId)
    this.run().catch((error) => {
      this.ctx.logger('engine').error(error)
      this.stop()
    })
  }

  /** 跳转场景（下一轮循环生效） */
  goto(id) {
    this.current = id
  }

  stop() {
    if (!this.running) return
    this.running = false
    this.ctx.emit('engine/stop')
    this.ctx.io.blank()
    this.ctx.io.print('游戏已退出，感谢游玩！')
    process.exit(0)
  }

  /** 主循环：渲染 → 过滤选项 → 输入 → 命令分发 → 效果 → 跳转 */
  async run() {
    while (this.running) {
      const scene = this.ctx.scenes.get(this.current)

      // 1. 离开旧场景 / 进入新场景（含 onEnter 效果）
      this.ctx.emit('scene/leave', this.current)
      const changes = this.ctx.state.apply(scene.onEnter)
      for (const { path, from, to } of changes) {
        this.ctx.logger('engine').info('effect %s: %s -> %s', path, from, to)
      }

      // mode 扩展点：默认 normal（引擎渲染选项并判定结局）；
      // 其他 mode（如 battle）由插件接管界面与输入，返回 falsy 则引擎回退渲染
      const mode = scene.mode ?? 'normal'
      const handled = mode === 'normal' ? false : !!this.ctx.bail('scene/mode', this.current, scene, mode)
      this.ctx.emit('scene/enter', this.current, scene)

      // 2. 文本渲染管道：插值 → waterfall 装饰
      let text = this.ctx.state.interpolate(scene.text)
      text = this.ctx.waterfall('text/render', text, (t) => t)

      // 3. 过滤选项（条件求值）
      const choices = (scene.choices ?? []).filter((choice) => this.ctx.state.check(choice.if))

      // 4. 输出场景
      this.ctx.io.blank()
      this.ctx.io.print(`── ${scene.title ?? this.current} ──`.padStart(0))
      this.ctx.io.print(text)
      this.ctx.io.blank()

      // 5. 结局判定：仅 normal 模式且无选项时算结局（battle 等模式由插件控制流转）
      if (mode === 'normal' && !choices.length) {
        this.ctx.emit('engine/end', this.current, scene)
        this.ctx.io.print('（完）')
        await this.ctx.io.ask('按回车结束游戏...')
        return this.stop()
      }

      // 页面渲染完成：插件可在此补充自己的界面（如战斗血条）
      this.ctx.emit('scene/rendered', this.current, scene, mode)

      // 选项渲染：normal 模式由引擎渲染；其他模式交给插件（handled 时跳过）
      if (mode === 'normal' || !handled) {
        choices.forEach((choice, index) => {
          this.ctx.io.print(`  [${index + 1}] ${choice.text}`)
        })
        this.ctx.io.blank()
      }

      // 6. 内层输入循环：noop 表示「插件已自行处理，继续等下一条输入，不重进场景」
      while (this.running) {
        const input = await this.ctx.io.ask(this.config.prompt ?? '>> ')
        if (!input) break // 空输入：回到外层重新渲染（回车=刷新，热重载也走这里）
        const result = await this.ctx.waterfall('engine/command', input, choices, (line, list) => this.defaultCommand(line, list))

        if (!result) break
        if (result.type === 'noop') continue // 插件已渲染界面，继续等待输入

        // 7. 按命令协议执行
        switch (result.type) {
          case 'choice': {
            const choice = choices[result.index]
            const effects = this.ctx.state.apply(choice.do)
            for (const { path, from, to } of effects) {
              this.ctx.logger('engine').info('effect %s: %s -> %s', path, from, to)
            }
            this.ctx.emit('choice/made', this.current, choice, effects)
            if (choice.goto !== undefined) {
              const target = String(choice.goto)
              if (target === '@restart') {
                this.ctx.state.reset()
                this.goto(this.config.entry)
              } else {
                this.goto(target)
              }
            }
            break
          }
          case 'scene':
            this.goto(result.id)
            break
          case 'quit':
            return this.stop()
          case 'rerender':
            break
          default:
            this.ctx.io.print('（未识别的输入，输入 help 查看帮助）')
        }
        break // 非 noop 一律回到外层重新渲染
      }
    }
  }

  /** 默认命令处理器：编号选项 + 内置命令 */
  defaultCommand(line, choices) {
    const number = Number(line)
    if (Number.isInteger(number) && number >= 1 && number <= choices.length) {
      return { type: 'choice', index: number - 1 }
    }
    switch (line.toLowerCase()) {
      case 'help':
      case '?':
        this.ctx.io.print('内置命令: 输入选项编号进行选择 | help 帮助 | stats 查看状态 | quit 退出')
        return { type: 'rerender' }
      case 'stats':
      case 'status': {
        const get = (path) => this.ctx.state.get(path)
        this.ctx.io.print(`  ${get('name')} | HP ${get('hp')} | ATK ${get('atk')} | 金币 ${get('gold')}`)
        const held = Object.entries(get('items') ?? {}).filter(([, count]) => count > 0)
        this.ctx.io.print('  背包: ' + (held.length ? held.map(([k, v]) => `${k}×${v}`).join(', ') : '（空）'))
        return { type: 'rerender' }
      }
      case 'quit':
      case 'exit':
        return { type: 'quit' }
      default:
        return { type: 'nothing' }
    }
  }
}

export default EngineService

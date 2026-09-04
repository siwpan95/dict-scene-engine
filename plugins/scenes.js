// 场景字典服务（引擎核心）：把「场景」抽象为一个字典（Dict<Scene>）
// 内容包只需导出一个纯数据/纯函数字典，即可被引擎解释执行。
//
// 场景 Schema：
//   {
//     title: '场景标题',
//     text:  '描述文本，支持 {name} {hp} 等状态插值',
//     onEnter: { ...effects },          // 进入场景时执行的效果（可选）
//     choices: [                         // 选项（可选；无选项 = 结局场景）
//       {
//         text: '选项文本',
//         if: 'hp >= 10 && gold > 0',    // 显示条件（可选，基于玩家状态求值）
//         do: { hp: -5, gold: +1 },      // 选中后执行的效果（可选）
//         goto: 'next-scene',            // 目标场景 ID
//       },
//     ],
//   }

import { Service } from 'cordis'

export const name = 'scenes'

export class SceneService extends Service {
  static inject = []

  constructor(ctx, config) {
    super(ctx, 'scenes')
    this.config = config
    /** @type {Record<string, object>} 场景字典本体 */
    this.dict = Object.create(null)
    /** 内容包路径列表（顺序即覆盖优先级：后者覆盖前者） */
    this.packs = []
    /** 已加载的内容包内容缓存：path -> pack 字典 */
    this.loaded = new Map()
  }

  async [Service.init]() {
    for (const path of this.config.packs ?? []) {
      await this.load(path)
    }
    this.rebuild()
    this.ctx.logger('scenes').info('loaded %d scenes from %d pack(s)', this.size, this.packs.length)
  }

  /** 加载一个内容包（JS 模块导出字典；同 ID 场景后者覆盖前者） */
  async load(path) {
    const pack = await this.importPack(path)
    this.loaded.set(path, pack)
    if (!this.packs.includes(path)) this.packs.push(path)
    return pack
  }

  /** 热重载一个内容包：绕过 ESM 缓存重新导入并重建字典 */
  async reload(path) {
    if (!this.loaded.has(path)) {
      this.ctx.logger('scenes').warn('reload skipped: 内容包 %s 不在配置中', path)
      return false
    }
    try {
      const pack = await this.importPack(path, Date.now())
      this.loaded.set(path, pack)
      this.rebuild()
      return true
    } catch (error) {
      this.ctx.logger('scenes').error('reload failed: %s（保留旧内容）', error.message)
      return false
    }
  }

  async importPack(path, cacheBust) {
    let url = new URL(path, this.ctx.root.baseUrl).href
    if (cacheBust !== undefined) url += '?t=' + cacheBust
    const exports = await import(url)
    const pack = exports.default ?? exports
    if (!pack || typeof pack !== 'object') {
      throw new Error(`场景包 ${path} 未导出字典对象`)
    }
    const errors = this.validate(pack, path)
    if (errors.length) {
      throw new Error(`场景包 ${path} 校验失败:\n${errors.join('\n')}`)
    }
    return pack
  }

  /** 按 packs 顺序重建场景字典，并校验 goto 引用 */
  rebuild() {
    this.dict = Object.create(null)
    for (const path of this.packs) {
      for (const [id, scene] of Object.entries(this.loaded.get(path) ?? {})) {
        this.dict[id] = scene
      }
    }
    const dangling = []
    for (const [id, scene] of Object.entries(this.dict)) {
      for (const [i, choice] of (scene.choices ?? []).entries()) {
        const target = choice?.goto
        if (target !== undefined && !String(target).startsWith('@') && !(target in this.dict)) {
          dangling.push(`  - #${id} 第 ${i + 1} 个选项 -> "${target}"`)
        }
      }
    }
    if (dangling.length) {
      throw new Error(`存在未定义的场景跳转:\n${dangling.join('\n')}`)
    }
  }

  /** 校验字典结构，返回错误列表（空数组 = 通过） */
  validate(pack, source = '<inline>') {
    const errors = []
    for (const [id, scene] of Object.entries(pack)) {
      const at = `${source}#${id}`
      if (!scene || typeof scene !== 'object') {
        errors.push(`  - ${at}: 场景必须是对象`)
        continue
      }
      if (typeof scene.text !== 'string') {
        errors.push(`  - ${at}: 缺少 text 字段`)
      }
      if (scene.choices !== undefined && !Array.isArray(scene.choices)) {
        errors.push(`  - ${at}: choices 必须是数组`)
      }
      for (const [i, choice] of (scene.choices ?? []).entries()) {
        if (!choice || typeof choice !== 'object' || typeof choice.text !== 'string') {
          errors.push(`  - ${at}: 第 ${i + 1} 个选项缺少 text`)
        }
      }
    }
    return errors
  }

  get(id) {
    const scene = this.dict[id]
    if (!scene) throw new Error(`场景 "${id}" 不存在（可用: ${this.ids.join(', ')}）`)
    return scene
  }

  has(id) {
    return id in this.dict
  }

  get size() {
    return Object.keys(this.dict).length
  }

  get ids() {
    return Object.keys(this.dict)
  }
}

export default SceneService

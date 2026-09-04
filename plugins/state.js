// 玩家状态服务：属性/背包/标志位 + 效果执行 + 条件求值
//
// 效果（effects）语义 —— 一个普通对象：
//   { hp: -5 }            数值   → 加减
//   { 'name': '勇者' }     字符串 → 赋值
//   { 'flags.metKing': true }  点路径 → 深层赋值
//   { 'items.sword': +1 } 点路径 + 数值 → 深层计数
//
// 条件（if）语义 —— 一个字符串表达式，基于状态作用域求值：
//   'hp >= 10 && gold > 0'      'items.sword >= 1'      '!flags.doorLocked'
// 实现为受限作用域的 Function 求值：只暴露状态视图，不暴露 process/fs 等。
// 信任边界：内容包是本地可信文件（与 Twine 等引擎同级别约束）。

import { Service } from 'cordis'

export const name = 'state'

export class StateService extends Service {
  static inject = []

  constructor(ctx, config) {
    super(ctx, 'state')
    this.config = config
    /** 深层快照，用于存档 */
    this.data = structuredClone(config.initial ?? {})
  }

  /** 读取点路径，如 'items.sword'；缺失返回 undefined */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.data)
  }

  /** 写入点路径（自动创建中间对象） */
  set(path, value) {
    const keys = path.split('.')
    let obj = this.data
    while (keys.length > 1) {
      const key = keys.shift()
      if (typeof obj[key] !== 'object' || obj[key] === null) obj[key] = {}
      obj = obj[key]
    }
    obj[keys[0]] = value
  }

  /** 执行一个效果对象，返回变更记录 [{ path, from, to }] */
  apply(effects) {
    const changes = []
    if (!effects) return changes
    for (const [path, value] of Object.entries(effects)) {
      const from = this.get(path)
      let to = value
      if (typeof value === 'number' && typeof from === 'number') {
        to = from + value
      } else if (typeof value === 'number' && from === undefined) {
        to = value
      }
      this.set(path, to)
      changes.push({ path, from, to })
    }
    return changes
  }

  /** 求值条件表达式；无条件时恒真；异常按 false 处理并告警
   *  @param {string} expr 表达式（基于状态作用域）
   *  @param {object} extra 附加上下文（如 { scene, choice, effects }），合并进作用域
   */
  check(expr, extra = {}) {
    if (expr === undefined || expr === null || expr === '') return true
    try {
      const fn = new Function('with (this) { return (' + expr + ') }')
      return !!fn.call({ ...this.view(), ...extra })
    } catch (error) {
      this.ctx.logger('state').warn('条件求值失败 "%s": %s', expr, error.message)
      return false
    }
  }

  /** 扁平化状态视图：把 items.sword 暴露为 items.sword 可访问的对象 */
  view() {
    const build = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj
      const proxy = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object') {
          proxy[key] = build(value)
        } else {
          proxy[key] = value
        }
      }
      return proxy
    }
    return build(this.data)
  }

  /** 用状态值插值文本：'你好，{name}！' */
  interpolate(text) {
    return String(text).replace(/\{([\w.]+)\}/g, (raw, path) => {
      const value = this.get(path)
      return value === undefined ? raw : String(value)
    })
  }

  reset() {
    this.data = structuredClone(this.config.initial ?? {})
  }

  snapshot() {
    return structuredClone(this.data)
  }

  restore(data) {
    this.data = structuredClone(data)
  }
}

export default StateService

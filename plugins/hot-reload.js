// 内容热重载插件 —— 「改字典，游戏内即时生效」
//
// watch 内容包目录，.js 文件变化时（防抖后）：
//   1. 带时间戳重新 import（绕过 ESM 模块缓存）
//   2. ctx.scenes.reload(path) 重建场景字典（旧场景即时替换）
//   3. emit 'hot-reload/applied' 通知其他插件
//   4. ctx.io.wake('') 注入空输入 → 引擎立即用新字典重渲染当前场景
//
// 这正是 Cordis 论文「时空可组合性」的落地体验：运行时动态替换内容，
// 玩家状态（时间轴上的状态）完全保留，只有空间（场景字典）被更新。
//
// 注意：官方 @cordisjs/plugin-hmr 尚未发布到 npm 且要求 --expose-internals
// 内部 API；本插件只用公开 API 实现文字游戏最常用的「内容热重载」场景。

import { Service } from 'cordis'
import { watch } from 'chokidar'
import { join, relative } from 'node:path'

export const name = 'hot-reload'

export class HotReloadService extends Service {
  static inject = ['scenes', 'io']

  constructor(ctx, config) {
    super(ctx, 'hot-reload')
    this.config = config
  }

  [Service.init]() {
    const paths = (this.config.paths ?? ['./content']).map((p) => join(process.cwd(), p))
    const watcher = watch(paths, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
    })
    this.ctx.root.effect(() => () => watcher.close())

    let timer = null
    watcher.on('all', (event, file) => {
      if (!file.endsWith('.js')) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        this.apply(file).catch((error) => this.ctx.logger('hot-reload').error(error))
      }, this.config.debounce ?? 200)
    })
    this.ctx.logger('hot-reload').info('watching %s', paths.join(', '))
  }

  async apply(file) {
    // 转为配置里 packs 的相对路径形式（./content/xxx.js，正斜杠）
    const rel = './' + relative(process.cwd(), file).replaceAll('\\', '/')
    const ok = await this.ctx.scenes.reload(rel)
    if (!ok) return
    this.ctx.io.print(`  ⚡ 内容已热更新：${rel}（场景总数 ${this.ctx.scenes.size}）`)
    this.ctx.emit('hot-reload/applied', rel)
    this.ctx.io.wake('')
  }
}

export default HotReloadService

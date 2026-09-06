// 引擎启动器（game.js 与 cli.js 共用）
//
// 抽出成模块的原因：CLI 需要在启动前设置环境变量（如 DSE_INPUT 脚本输入），
// 再走同一套启动流程，避免"游戏"与"命令行"两套启动代码漂移。
//
// 架构对齐 Cordis 官方 bin.js 模式：
//   1. 创建根 Context（服务容器）
//   2. 挂载 Loader 插件（提供 ctx.loader 声明式加载能力）
//   3. 通过 @cordisjs/plugin-include 加载 ./cordis.yml 插件清单

import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'

/**
 * 启动引擎（加载 cordis.yml 声明的全部插件并进入主循环）
 * @param {{ banner?: boolean, quiet?: boolean }} options
 *        banner: 是否打印启动横幅（CLI 非交互模式下可关掉，便于机器解析输出）
 */
export async function boot(options = {}) {
  const { banner = true, quiet = false } = options
  const ctx = new Context()
  ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

  if (banner) {
    console.log('╔══════════════════════════════════════════╗')
    console.log('║   字 典 场 景 引 擎  v0.1.0              ║')
    console.log('║   Dictionary Scene Engine (Cordis)       ║')
    console.log('╚══════════════════════════════════════════╝')
  }

  await ctx.plugin((await import('@cordisjs/plugin-loader')).default)
  await ctx.loader.create({
    name: '@cordisjs/plugin-include',
    config: {
      path: './cordis.yml',
      enableLogs: !quiet,
    },
  })

  // 插件级 HMR（官方 @cordisjs/plugin-hmr，本地构建于 vendor/plugin-hmr）
  // 依赖 Node 内部模块加载器，必须以 --expose-internals 启动才可用。
  if (process.execArgv.includes('--expose-internals')) {
    await ctx.loader.create({
      name: './vendor/plugin-hmr/index.js',
      config: { root: ['.'], debounce: 200 },
    })
  } else if (banner) {
    console.log('ℹ  插件级 HMR 未启用：需 --expose-internals（npm run start:hmr）')
  }

  // 等待所有插件任务完成（加载失败只记日志不抛出）
  await ctx.loader.await()
  return ctx
}

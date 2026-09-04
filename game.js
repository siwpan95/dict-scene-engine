#!/usr/bin/env node
// dict-scene-engine 启动器
// 架构对齐 Cordis 官方 bin.js 模式：
//   1. 创建根 Context（服务容器）
//   2. 挂载 Loader 插件（提供 ctx.loader 声明式加载能力）
//   3. 通过 @cordisjs/plugin-include 加载 ./cordis.yml 插件清单
// 此后有哪些插件、如何配置，全部由 cordis.yml 声明，启动器不再关心。

import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

console.log('╔══════════════════════════════════════════╗')
console.log('║   字 典 场 景 引 擎  v0.1.0              ║')
console.log('║   Dictionary Scene Engine (Cordis)       ║')
console.log('╚══════════════════════════════════════════╝')

await ctx.plugin((await import('@cordisjs/plugin-loader')).default)
await ctx.loader.create({
  name: '@cordisjs/plugin-include',
  config: {
    path: './cordis.yml',
    enableLogs: true,
  },
})

// 插件级 HMR（官方 @cordisjs/plugin-hmr，本地构建于 vendor/plugin-hmr）
// 依赖 Node 内部模块加载器，必须以 --expose-internals 启动才可用：
//   npm run start:hmr   等价于 node --expose-internals game.js
// 未带该标志时自动跳过，游戏与内容热重载（hot-reload 插件）照常工作。
if (process.execArgv.includes('--expose-internals')) {
  await ctx.loader.create({
    name: './vendor/plugin-hmr/index.js',
    config: {
      root: ['.'],
      debounce: 200,
    },
  })
} else {
  console.log('ℹ  插件级 HMR 未启用：需 --expose-internals（npm run start:hmr）')
}

// 等待所有插件任务完成（加载失败只记日志不抛出）
await ctx.loader.await()

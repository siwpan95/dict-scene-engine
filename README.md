# 字典场景引擎（dict-scene-engine）

基于 **Cordis 4.0** 插件架构的文字冒险游戏引擎。核心理念一句话：**场景即字典，能力即插件** —— 游戏内容是一份纯数据字典，引擎的每个能力是一个可插拔插件，两者通过 cordis.yml 声明式组装。

> 架构参照：[Cordis：时空可组合性元框架](https://arxiv.org/abs/2608.25512)（本仓库 `../paper-main/paper.pdf`）与 DeepSeek Harness 的 Cordis 插件实践。

## 快速开始

```bash
cd dict-scene-engine
npm install
npm start          # 开始游戏
npm run start:hmr  # 开启插件级热重载（官方 HMR，需 --expose-internals）
npm test           # 端到端验证（52 项断言，spawn 真实进程驱动）
npm run build:hmr  # 从本地 cordis 源码重建官方 HMR 插件
```

## 目录结构

```
dict-scene-engine/
├── game.js               # 启动器：根 Context + Loader + include cordis.yml
├── cordis.yml            # 插件清单（声明式组装，改它 = 改游戏构成）
├── plugins/              # 引擎插件（每个能力一个插件，通过 ctx.<service> 通信）
│   ├── scenes.js         # ctx.scenes   字典场景服务（核心）：加载/校验/查询/热重载
│   ├── state.js          # ctx.state    玩家状态：dot-path 读写、效果执行、条件求值
│   ├── console-io.js     # ctx.io       终端 IO 适配器（换 UI 只换这个插件）
│   ├── engine.js         # ctx.engine    主循环：场景解释器 + 事件分发（含 mode 扩展点）
│   ├── save.js           # ctx.save     存档/读档
│   ├── achievements.js   # 成就系统（纯事件监听 + 命令拦截）
│   ├── combat.js         # 战斗数值系统（回合制战斗 + 敌人/武器字典，接管 battle 场景）
│   ├── sound.js          # 音效（事件订阅 → 程序化合成 PCM → 播放）
│   └── hot-reload.js     # 内容热重载（改场景字典，游戏内即时生效）
├── content/              # 内容包（纯数据字典，零引擎代码）
│   ├── demo.js           # 示例剧本《古堡寻剑》+ 试炼场（13 个场景）
│   └── starport.js       # DLC《星港潜行》（4 个场景，演示多包叠加与跨包跳转）
├── vendor/plugin-hmr/    # 官方 HMR 插件（本地构建产物，源码未发布到 npm）
├── scripts/build-hmr.mjs # 从 E:\run and run 的 cordis 源码构建官方 HMR
├── tests/
│   └── e2e.mjs           # 端到端测试：9 组 52 项断言
└── saves/                # 存档目录（运行时生成，已 gitignore）
```

## 架构

```
                cordis.yml（声明式插件清单）
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   plugins/scenes   plugins/state   plugins/io ...
        │  ctx.scenes    │  ctx.state    │  ctx.io
        └───────┬───────┴───────┬───────┘
                ▼               ▼
           plugins/engine  ──── 依赖注入(inject)就绪后自动启动
                │
                ├─ ctx.waterfall('text/render')    文本渲染管道
                ├─ ctx.waterfall('engine/command') 输入命令分发（save.js 在此拦截）
                ├─ ctx.emit('scene/enter') ...     生命周期事件
                ▼
           内容包 content/*.js（场景字典）
```

### 为什么是 Cordis？

| 需求 | Cordis 提供的机制 |
| --- | --- |
| 新能力（音效/成就/战斗）不改引擎 | 插件 + `ctx.provide` 服务 + 事件监听 |
| 加载顺序正确 | `inject` 声明依赖，就绪后自动启动 |
| 内容与代码分离 | 场景字典是纯数据模块，`cordis.yml` 一行换内容包 |
| 可逆副作用（HMR、热重载） | `ctx.effect` 注册自动回收 |

## 场景字典 Schema

一个内容包导出 `{ 场景ID: 场景定义 }`：

```js
export default {
  start: {
    title: '村庄 · 晨雾',
    text: '{name}，你的 HP 是 {hp}。',   // 支持状态插值
    onEnter: { gold: -5 },                // 进入场景时执行的效果
    choices: [                            // 无 choices = 结局场景
      {
        text: '花 10 金币买剑',
        if: 'gold >= 10',                 // 显示条件（基于状态表达式求值）
        do: { gold: -10, 'items.rusty_sword': +1 },  // 选中后的效果
        goto: 'castle',                   // 跳转；支持 '@restart' 重开
      },
    ],
  },
}
```

### 效果（effects）语义

| 写法 | 语义 |
| --- | --- |
| `{ hp: -5 }` | 数值 → 加减 |
| `{ name: '勇者' }` | 非数值 → 赋值 |
| `{ 'flags.doorOpen': true }` | 点路径 → 深层赋值 |
| `{ 'items.sword': +1 }` | 点路径 + 数值 → 深层计数 |

### 条件（if）语义

字符串表达式，基于状态作用域求值（受限 Function，不暴露进程环境）：

```
'hp >= 10 && gold > 0'    'items.sword >= 1'    '!flags.doorLocked'
```

## 插件与事件协议

引擎通过类型化事件对外扩展（监听器随插件卸载自动回收）：

| 事件 | 模式 | 用途 |
| --- | --- | --- |
| `text/render` | waterfall | 文本渲染管道（插值 → 装饰，可层层包裹） |
| `engine/command` | waterfall | 输入命令分发；默认处理器匹配选项编号，插件 prepend 拦截自定义命令 |
| `scene/mode` | bail | **模式扩展点**：场景声明非 `normal` 模式时发出，插件返回 truthy 即宣告接管该场景 |
| `scene/rendered` | emit | 场景文本渲染完成，插件可补充自己的界面（如战斗血条） |
| `scene/enter` / `scene/leave` | emit | 场景生命周期 |
| `choice/made` | emit | 选项被选中、效果执行后 |
| `engine/start` / `engine/end` / `engine/stop` | emit | 游戏生命周期 |
| `achievement/unlock` | emit | 成就解锁 |
| `battle/start` `battle/hit` `battle/crit` `battle/end` | emit | 战斗生命周期（音效插件订阅发声） |
| `save/applied` | emit | 存档写入完成 |
| `hot-reload/applied` | emit | 内容热重载完成 |

`engine/command` 返回值协议：

```js
{ type: 'choice', index }   // 执行第 index 个选项
{ type: 'scene', id }       // 跳转场景
{ type: 'rerender' }        // 重新渲染当前场景（重进场景，会触发 scene/enter）
{ type: 'noop' }            // 插件已自行处理界面，继续等待下一条输入（不重进场景）
{ type: 'quit' }            // 退出
{ type: 'nothing' }         // 未识别
```

### 模式扩展点（scene.mode）

场景声明 `mode: 'battle'` 后，引擎会发出 `scene/mode` 事件；战斗插件返回 truthy 接管该场景的输入与界面，引擎不再渲染选项、不再判定结局。战斗结束由插件调用 `engine.goto(battle.onWin / battle.onLose)` 流转剧情。

```js
arena: {
  title: '试炼场 · 独眼狼',
  text: '...',
  mode: 'battle',
  battle: { enemy: 'wolf', onWin: 'arena-win', onLose: 'arena-lose', onFlee: 'start' },
}
```

同一机制可用于商店、对话、解谜等任何需要专属交互的场景类型 —— 引擎核心无需改动。

### 战斗数值

```
伤害 = max(1, round((atk × 随机波动(±variance) - def × defenseFactor) × 暴击倍率))
防御姿态：受到伤害 × defendCut
逃跑成功率：fleeChance
玩家实际 ATK = 基础 atk + Σ(武器加成 × 持有数量)
```

公式参数、武器表、敌人字典全部在 `cordis.yml` 的 `combat` 条目配置（数据驱动）。战斗指令：`a` 攻击 / `d` 防御 / `r` 逃跑 / `help` 帮助。

## 扩展指南

**加一个新能力插件**（示例：成就系统）：

```js
// plugins/achievements.js
import { Service } from 'cordis'
export default class Achievements extends Service {
  static inject = ['state', 'engine', 'io']
  constructor(ctx, config) {
    super(ctx, 'achievements')
    ctx.on('scene/enter', (scene) => { /* 检查成就条件 */ })
    ctx.on('engine/command', (line, choices, next) => { /* 拦截 achievements 命令 */ })
  }
}
```

然后在 `cordis.yml` 加一行：

```yaml
- id: achievements
  name: ./plugins/achievements.js
  config:
    list:
      - { id: wolf-slayer, name: 屠狼者, desc: 战胜独眼狼, when: 'scene === "wolf-win"' }
```

**换内容包 / 加内容包**：`cordis.yml` 的 `scenes.config.packs` 列表增删路径即可（支持多包，同 ID 后者覆盖前者，跨包跳转自动校验）。

**两级热重载**：
- **内容级**（默认启用）：运行时编辑 `content/*.js` 保存即生效，玩家状态保留。由 `hot-reload` 插件提供，纯公开 API。
- **插件级**（`npm run start:hmr`）：修改 `plugins/*.js` 时自动重新加载该插件（其他插件与玩家状态不受影响）。由官方 `@cordisjs/plugin-hmr` 提供 —— 该包未发布到 npm，本项目用 `npm run build:hmr` 从 `E:\run and run\cordis-4.0.0-rc.9\packages\hmr` 源码构建到 `vendor/plugin-hmr`；它需要 `node --expose-internals` 才能访问 Node 内部模块加载器，未带该标志时启动器自动跳过。

**音效**：程序化合成（波形 sine/square/saw/triangle + ADSR 包络），无外部音频资源；订阅事件自动发声，可用 `DSE_MUTE=1` 静音，或在 `cordis.yml` 覆盖音色表。

**内置命令**：输入选项编号选择；`help` 帮助；`stats` 状态；`achievements` 成就；`quit` 退出；`save [位]` / `load [位]` / `slots` 存档。战斗场景内：`a` 攻击 / `d` 防御 / `r` 逃跑。

## 环境要求

- Node.js >= 22（本地 22.22.2 已验证；插件级 HMR 额外需要 `--expose-internals`）
- 运行依赖：cordis 4.0.0-rc.9、@cordisjs/plugin-loader 1.0.0-rc.6、@cordisjs/plugin-include 1.0.5、@cordisjs/plugin-logger-console 1.0.0、@cordisjs/plugin-timer 1.1.3、chokidar 4
- 构建依赖（仅重建官方 HMR 时需要）：esbuild、@babel/code-frame、picomatch、schemastery

## 踩坑记录（Windows 环境实测）

1. **`rl.question()` 在 win32 管道下每行只返回首字符**（自动化测试/管道输入不可靠，TTY 交互正常）→ console-io 改用 readline async iterator + 等待队列。
2. **瀑布事件监听器若为 async，返回值是 Promise**，消费方必须 `await` → 引擎侧 `await ctx.waterfall('engine/command', ...)`。
3. cordis 4 的 logger 默认只写内存缓冲，需挂 `@cordisjs/plugin-logger-console` 才有终端输出。
4. 官方 `@cordisjs/plugin-hmr` 未发布到 npm，且要求 `node --expose-internals`（内部 ModuleLoader API）→ 用 esbuild 从本地源码构建到 `vendor/plugin-hmr`；内容级热重载仍用公开 API 自实现（import 时间戳缓存绕过 + 字典重建 + `ctx.io.wake` 注入空输入触发重渲染）。
5. **插件 init 的执行顺序不保证等于 cordis.yml 声明顺序**（实测最后声明的 hot-reload 第二个执行）→ 插件若在 init 里同步打启动日志，可能早于 logger-console 注册 exporter 而丢失；需先 `await` 让出一个宏任务。
6. 引擎 `rerender` 会**重新进入场景**（触发 scene/enter）；插件想要"原地等待下一条输入"必须返回 `noop`，否则战斗等状态会被重置。
7. 管道输入 + `process.exit()` 组合下 stdout 未 flush，后续输出会丢失 —— 排查时表现为"代码执行到一半"，实为测试环境假象，须用 spawn 保持 stdin 打开来验证。

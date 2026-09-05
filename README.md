# 字典场景引擎（dict-scene-engine）

基于 **Cordis 4.0** 插件架构的文字冒险游戏引擎。核心理念一句话：**场景即字典，能力即插件** —— 游戏内容由场景字典描述，引擎的每个能力是一个可插拔插件，两者通过 cordis.yml 声明式组装。

> 架构参照：[Cordis：时空可组合性元框架](https://arxiv.org/abs/2608.25512)（论文 PDF：见仓库 `paper-main/paper.pdf`）与 DeepSeek Harness 的 Cordis 插件实践。

---

## ⚠️ 安全须知（安装/运行任何内容包之前请先读这段）

**内容包不是数据文件，是可执行代码。** 加载一个内容包，等价于运行别人的 `.exe`。

- `content/*.js` 是被 `import()` 的 **ESM 模块**，模块顶层代码会立即执行，拥有完整的 Node 运行时权限（可读写文件、发起网络请求、执行子进程）。
- `cordis.yml` 中的 `when` 条件表达式同样会被求值执行（`state.check()` → `new Function`）。
- 启用内容热重载后，`content/` 下任何 `.js` 变更都会在约 200ms 后自动重新加载，**无需任何确认**。

因此：

1. **只安装你信任的来源**的内容包与 `cordis.yml`。下载/分享第三方 DLC 与分发可执行文件是同一风险等级。
2. 内容包的 `validate()` 只是**开发体验检查**（帮你发现字段拼写错误），**不是安全控制**——`import()` 先于 `validate()` 执行，模块顶层代码在校验之前就已跑完。不要依赖它来"过滤"不可信内容包。
3. 想运行来源不明的内容，请在容器/沙箱/无敏感数据的一次性环境中进行。

## 快速开始

```bash
cd dict-scene-engine
npm install
npm start          # 开始游戏
npm run start:hmr  # 开启插件级热重载（官方 HMR，需 --expose-internals）
npm test           # 端到端验证（116 项断言，spawn 真实进程驱动）
npm run lint:content  # 内容校验：悬空 goto / 不可达场景 / 结局可达 / 死变量
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
├── content/              # 内容包（⚠️ 可执行 ESM 模块，只装可信来源）
│   ├── demo.js           # 示例剧本《古堡寻剑》+ 试炼场（13 个场景）
│   └── starport.js       # DLC《星港潜行》（4 个场景，演示多包叠加与跨包跳转）
├── vendor/plugin-hmr/    # 官方 HMR 插件（本地构建产物，源码未发布到 npm）
├── scripts/build-hmr.mjs # 从 E:\run and run 的 cordis 源码构建官方 HMR
├── tests/
│   └── e2e.mjs           # 端到端测试：14 组 116 项断言
│                         #   A~E 剧情分支 / F 内容热重载 / G 音效 / H 战斗
│                         #   I 官方 HMR / J 战斗中命令 / K 存档安全
│                         #   L 重放回归 / M 退出竞态 / N 内容校验
├── docs/
│   ├── CONTENT-EXPANSION-PLAN.md  # 内容扩容规划（Phase 1～3）
│   └── NARRATIVE-LEDGER.md        # 叙事账本：状态变量的唯一权威清单
└── saves/                # 存档目录（运行时生成，已 gitignore）
```

## 当前内容规模

| 指标 | 数值 |
| --- | --- |
| 场景 | 28（主线 24 + 星港 DLC 4） |
| 正文字数 | 4,347（均长 155 字/场景） |
| 结局 | 4（全部可达） |
| 状态变量 | flags 5 / items 5（无死变量） |
| 结构 | branch-and-bottleneck + 村庄枢纽可重访 |

内容校验：

```bash
npm run lint:content
```

检查悬空 goto、不可达场景、结局可达性、叙事账本一致性（未声明引用与死变量）、场景厚度、疑似假选择、ID 命名。当前 **0 错误 0 警告**。

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
| 内容与引擎解耦 | 场景字典描述内容，`cordis.yml` 一行换内容包（⚠️ 但内容包本身是可执行模块，见顶部安全须知） |
| 可逆副作用（HMR、热重载） | `ctx.effect` 注册自动回收 |

## 场景字典 Schema

一个内容包导出 `{ 场景ID: 场景定义 }`：

```js
export default {
  start: {
    title: '村庄 · 晨雾',
    text: '{name}，你的 HP 是 {hp}。',   // 状态插值
    // title 与 choice.text 同样支持插值：'需 10 金币（你有 {gold}）'
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

**状态插值**作用于三处：`scene.text`、`scene.title`、`choice.text`，写法 `{path}`（点路径，如 `{gold}`、`{items.rusty_sword}`）；路径不存在时原样保留 `{path}`。

### 效果（effects）语义

| 写法 | 语义 |
| --- | --- |
| `{ hp: -5 }` | 数值 → 加减 |
| `{ name: '勇者' }` | 非数值 → 赋值 |
| `{ 'flags.doorOpen': true }` | 点路径 → 深层赋值 |
| `{ 'items.sword': +1 }` | 点路径 + 数值 → 深层计数 |

### 条件（if）语义

字符串表达式，用 `new Function` 求值，玩家状态通过 `with` 注入作用域：

```
'hp >= 10 && gold > 0'    'items.sword >= 1'    '!flags.doorLocked'
```

> ⚠️ **这不是沙箱。** `new Function` 的作用域参数不构成任何隔离——裸标识符 `process`、`globalThis.fetch` 等全局对象在表达式里直接可达。`validate()` 同理只查字段结构，不做安全检查。**触发面仅限内容包与 cordis.yml 的 `when` 字段，玩家在终端里输入的内容不会进入这里。**

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
6. 引擎 `rerender` 会**重新进入场景**（触发 scene/enter）；插件想要"原地等待下一条输入"必须返回 `noop`，否则战斗等状态会被重置。⚠️ **该问题已修**：现在 `rerender` 只重绘、不重进（见上文主循环设计）。
7. ~~管道输入 + `process.exit()` 组合下 stdout 未 flush，后续输出会丢失 —— 实为测试环境假象。~~ **该结论是错的，已订正**：`npm start > log.txt` 同样丢尾部输出，这是 `process.exit()` 的真实缺陷。现已改为 `process.exitCode = 0` + 主动 dispose 根作用域（见下条）。
8. **去掉 `process.exit()` 后进程仍可能不退出**：残留句柄会吊住事件循环 —— 实测有两类：① spawn 的音效播放子进程（须 `child.unref()`）；② chokidar 的 `watcher.close()` 是异步的（disposer 必须 `await`）。另需 `process.stdin.pause()` 释放 stdin 句柄。
9. **插件 init 与退出存在竞态**：极速输入（管道里 `1\n1\nquit` 一闪而过）时游戏可能在插件 init 完成前就 dispose，此时 `ctx.on` 抛 `INACTIVE_EFFECT` → 进程非零退出。事件注册要放在 init 早期，并对该错误码做良性处理。

## 退出机制

游戏退出时不调用 `process.exit()`，而是设置 `process.exitCode = 0` 后主动 dispose 根作用域，由 Node 在句柄清空后自然退出。收益有三：

1. cordis 的清理 effect 得以执行 —— 音效临时 WAV 不再残留在系统临时目录（实测 5 个 → 0 个）
2. 输出不被截断 —— `npm start > log.txt` 尾部完整
3. 引擎可嵌入宿主程序，不再强行终结进程

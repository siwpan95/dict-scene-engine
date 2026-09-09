# 字典场景引擎（dict-scene-engine）

基于 **Cordis 4.0** 插件架构的文字冒险游戏引擎。核心理念一句话：**场景即字典，能力即插件** —— 游戏内容由场景字典描述，引擎的每个能力是一个可插拔插件，两者通过 cordis.yml 声明式组装。

> 架构参照：[Cordis：时空可组合性元框架](https://arxiv.org/abs/2608.25512) 与 DeepSeek Harness 的 Cordis 插件实践。

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
npm test           # 端到端验证（558 项断言，spawn 真实进程驱动）
npm run test:cli   # CLI 接口验证（48 项断言）
npm run test:all   # 两者都跑
npm run lint:content  # 内容校验：悬空 goto / 不可达场景 / 结局可达 / 死变量
npm run build:hmr  # 从本地 cordis 源码重建官方 HMR 插件
```

## 命令行接口（CLI）

除交互式游戏外，引擎提供 `dse` 命令，便于脚本 / CI 驱动。全局安装后可直接用 `dse`，本地用 `node cli.js`。

```bash
dse play --input "3,1,1"      # 非交互跑一条线路（逗号分隔输入序列）
dse play --entry caravan.camp --input "1"   # 从指定场景起跑
dse scenes                    # 列出全部场景（按命名空间分组，⚑ 结局 / ⚔ 模式接管）
dse scenes --scene caravan.fork             # 查看单个场景（含选项条件与跳转目标）
dse scenes --json | jq 'length'             # 结构化输出，可管道消费
dse info --json               # 项目统计（场景/字数/结局/模式/入口）
dse check                     # 内容校验（等价 npm run lint:content）
dse saves                     # 列出存档位
```

| 命令 | 作用 | 启动主循环 | 占用 stdin |
|---|---|---|---|
| `play --input` | 脚本驱动跑线路，输入用尽自动 `quit` | 是 | 否 |
| `play`（无 input） | 交互式游戏（等价 `npm start`） | 是 | 是 |
| `scenes` / `info` | 只读查询字典，不进主循环 | 否 | 否 |
| `check` | 复用 `scripts/lint-content.mjs` | 否 | 否 |
| `saves` | 列出 `saves/*.json` | 否 | 否 |

设计要点：

1. **不写第二套启动流程** —— `play` 与 `game.js` 共用 `lib/boot.js`。
2. **脚本输入靠环境变量透传** —— `DSE_INPUT="1,2,a"` 由 console-io 插件消费；序列用尽后自动返回 `quit`，走引擎正常退出流程（打印提示 → dispose → 退出码 0），不会卡在等待输入上。
3. **`--entry` 透传为 `DSE_ENTRY`** —— 引擎优先于 `cordis.yml` 的 `engine.entry`，`@restart` 与坏档回退也都用同一个值，保持一致。
4. **stdout 只放结果、诊断走 stderr** —— 保证 `dse scenes --json | jq` 这类管道消费不被污染；错误退出码非零。

典型用途：CI 里跑 `dse play --input "..."` 断言某条线路仍能抵达预期结局（见 `tests/cli.mjs` 的 P14：完整经营周目跑到 GOOD END）。

## 目录结构

```
dict-scene-engine/
├── game.js               # 游戏启动器（交互），内部调 lib/boot.js
├── cli.js                # 命令行接口 dse：play / scenes / info / check / saves
├── cordis.yml            # 插件清单（声明式组装，改它 = 改游戏构成）
├── lib/
│   ├── boot.js           # 启动流程（game.js 与 cli.js 共用）
│   └── dict.mjs          # 场景字典离线加载（CLI 只读命令用，不启动引擎）
├── plugins/              # 引擎插件（每个能力一个插件，通过 ctx.<service> 通信）
│   ├── scenes.js         # ctx.scenes   字典场景服务（核心）：加载/校验/查询/热重载
│   ├── state.js          # ctx.state    玩家状态：dot-path 读写、效果执行、条件求值
│   ├── console-io.js     # ctx.io       终端 IO 适配器（换 UI 只换这个插件）
│   ├── engine.js         # ctx.engine    主循环：场景解释器 + 事件分发（含 mode 扩展点）
│   ├── save.js           # ctx.save     存档/读档
│   ├── achievements.js   # 成就系统（纯事件监听 + 命令拦截）
│   ├── combat.js         # 战斗数值系统（回合制战斗 + 敌人/武器字典，接管 battle 场景）
│   ├── trade.js          # 经营数值系统（天数循环 + 库存买卖 + 确定性行情，接管 trade 场景）
│   ├── diary.js          # 日记回溯（M14，第三种 mode：只读重读已走过的篇目）
│   ├── dialogue.js       # 对话/谈判（M15，第四种 mode：话题询问 + 注意点预算）
│   ├── sound.js          # 音效（事件订阅 → 程序化合成 PCM → 播放）
│   ├── hot-reload.js     # 内容热重载（改场景字典，游戏内即时生效）
│   └── lib/
│       ├── safe-path.js      # 路径安全白名单（scenes/hot-reload 共用）
│       └── global-commands.js # 全局命令注册表（quit/save/成就… 战斗中放行的唯一名单）
├── content/              # 内容包（⚠️ 可执行 ESM 模块，只装可信来源）
│   ├── demo.js           # 主线《古堡寻剑》：开场 + 村庄枢纽 + 三路线 + 古堡内部
│   ├── starport.js       # DLC《星港潜行》：货舱潜入线 + 两案入口
│   ├── starport-case.js  # 侦探 Mod 第一案《星港迷案》（hub-and-spoke 知识标记）
│   ├── starport-case2.js # 侦探 Mod 第二案《港湾连环案》（多嫌疑人）
│   ├── demo-deep.js      # 古堡地下层 + 幽灵管家/炼金术士 NPC + 僭主/献祭结局
│   ├── caravan.js        # 新主线《荒漠商队》：贸易 + 战斗 + karma 道德选择
│   ├── town-trade.js     # 城镇经营 Mod《东市经营》：侦察 + 5 天经营 + 三结局
│   ├── wuxia.js          # 武侠短篇《刀客》：复仇 + 道德分叉 + 两场战斗
│   ├── scifi.js          # 科幻短篇《空间站疑云》：三证据调查链
│   ├── horror.js         # 恐怖短篇《古宅惊魂》：蜡烛资源管理 + 逃生
│   ├── loop.js           # M11 时间循环短篇《子夜集》：三核拼真相 + @loop 保留域
│   ├── post.js           # M12 情感短篇《驿路》：三天借宿的关系去留（留灯/出关/各安/冷）
│   ├── river.js          # M13 历史推理中篇《江畔·县志》：指认可错 + 三铁证定谳
│   ├── hushi.js          # M14 新主线《藏晖室札记》：五幕年代跃迁 1911→1960（胡适日记，7 结局）
│   ├── snow.js           # M15 中篇《雪庄·八客》：暴风雪山庄本格（指认可错纠错）
│   ├── crossing.js       # M15 中篇《渡口·子丑》：同一夜多视角（dialogue mode）
│   ├── garrison.js       # M15 中篇《戍卒·家书》：双篇章历史（记篇+忆篇）
│   ├── midnight.js       # M16 长线《同一夜·十二时辰》：群像六视角 + 时序锁
│   ├── ferry.js          # M17 长线《渡口纪年》：跨世界观四时四 POV（块茎网）
│   ├── castle-pre.js     # M18 古堡前史 DLC《筑堡者》：三子祭剑之夜（本体已完整）
│   ├── starport-echo.js  # M18 星港第二季 DLC《回声》：调度长溺毙案（本体已完整）
│   ├── teahouse.js       # M19 情感中篇《茶肆·三遇》：双轴 trust/closeness
│   ├── gear.js           # M19 解谜中篇《机巧阁》：if/do+items 机关链
│   ├── water.js          # M19 末日生存短篇《最后的水》：水量资源管理
│   └── grad.js           # M19 校园青春短篇《毕业那年》：关系 flag
├── vendor/plugin-hmr/    # 官方 HMR 插件（本地构建产物，源码未发布到 npm）
├── scripts/
│   ├── build-hmr.mjs     # 从本地 cordis-4.0.0-rc.9 源码构建官方 HMR
│   └── lint-content.mjs  # 内容校验器（悬空 goto / 可达性 / 账本一致性 / 契约 / 数值字段）
├── tests/
│   ├── e2e.mjs           # 端到端测试（内容/引擎行为）：30 组 558 项断言
│   ├── cli.mjs           # CLI 接口测试（命令行/脚本输入）：48 项断言
│   ├── traverse.mjs      # 结构-状态遍历（从 entry DFS 全图：执行每条 goto 边/效果/条件）
│   ├── coverage.mjs      # 结局覆盖审计（traverse ∪ e2e 双缺 == 0；生成 docs/TEST-COVERAGE.md）
│   └── playthrough.mjs   # 逐线实跑转录（stdout 落盘 deliverables，供人工阅读留存）
│                         #   支持 --only=DD1,DD2 只跑指定路线（全量约 9 分钟）
│                         #   A~E 剧情分支 / F 内容热重载 / G 音效 / H 战斗
│                         #   I 官方 HMR / J 战斗中命令 / K 存档安全
│                         #   L 重放回归 / M 退出竞态 / N 内容校验 / O 古堡探索 / P 商人结局
│                         #   Q 侦探真结局 / R 侦探冤案 / S 商队三结局 / T 经营三结局
│                         #   U 武侠刀客 / V 空间站疑云 / W 古宅惊魂 / X 跨包彩蛋
│                         #   Y 子夜集时间循环 / Z 驿路两线 / AA 江畔县志 / BB 结局直达 / CC AI-P0 千灯
├── docs/
│   ├── CONTENT-EXPANSION-PLAN.md  # 内容扩容规划（Phase 1～4）
│   ├── NARRATIVE-LEDGER.md        # 叙事账本：状态变量的唯一权威清单
│   ├── M14-HUSHI-DESIGN.md        # M14《藏晖室札记》设计规格：五幕结构 / 结局矩阵 / diary 插件规格
│   └── TEST-COVERAGE.md           # 结局覆盖矩阵（tests/coverage.mjs 生成，58 结局逐条 T/E 来源）
└── saves/                # 存档目录（运行时生成，已 gitignore）
```

## 当前内容规模

| 指标 | 数值 |
| --- | --- |
| 场景 | 455（古堡主线 48 + 星港 DLC 4 + 侦探两案 29 + 商队 19 + 经营 12 + 短篇三则 40 + 子夜集 17 + 驿路 13 + 江畔县志 20 + 千灯 8 + 面摊 9 + 皮影 8 + 萤火巷 8 + 藏晖室札记 33 + 雪庄八客 22 + 渡口子丑 15 + 戍卒家书 19 + 同一夜·十二时辰 28 + 渡口纪年 31 + 古堡前史 15 + 星港回声 18 + **茶肆三遇 15 + 机巧阁 14 + 最后的水 10 + 毕业那年 10**） |
| 正文字数 | 94,585（均长 208 字/场景） |
| 结局 | 102（全部可达） |
| 状态变量 | flags 100 / items 24（无死变量） |
| 成就 | 15 |
| 内容包 | 29（…渡口纪年 / 古堡前史 / 星港回声 / **茶肆三遇 / 机巧阁 / 最后的水 / 毕业那年**） |
| 跨包彩蛋 | 商队铜符可在东市卖 30 金（caravan ↔ town）；渡口纪年四 POV 回闪古堡/商道/江畔/民国（ferry ↔ demo/caravan/river/hushi 文字呼应）；古堡前史预言本体（castle-pre → demo 银匕首/断剑/地宫）；星港回声呼应第一案走私线（echo → starport-case） |
| 结构 | branch-and-bottleneck（主线）+ hub-and-spoke（侦探/商队/江畔，枢纽可重访）+ 时间循环（子夜集）+ 年代跃迁（藏晖室札记，五幕 1911→1960）+ 双篇章（戍卒·家书，记篇+忆篇）+ 多视角 dialogue（渡口·子丑）+ 群像网状时序锁（同一夜·十二时辰，六时辰六视角）+ 跨世界观块茎网（渡口纪年，四时四 POV）+ DLC 平行扩展（古堡前史/星港回声，本体已完整）+ **双轴关系数值（茶肆·三遇，trust/closeness）+ 内容层机关解谜（机巧阁，if/do+items）** |

内容校验：

```bash
npm run lint:content
```

检查悬空 goto、不可达场景、结局可达性、叙事账本一致性（未声明引用与死变量）、场景厚度、疑似假选择、ID 命名、模式契约与数值字段。当前 **0 错误 0 警告**。

### M14《藏晖室札记》考据与虚构标注

本线素材来自本地《胡适日记全集》存档（1910—1962，4603 篇 / 237 万字）。
**绝大多数场景有日记原文依据，但为叙事分支，少数处是虚构的**——逐条列清，不混为一谈。

**虚构分支（史实并非如此，仅作"另一个可能"）**

| 位置 | 虚构内容 | 史实 |
|---|---|---|
| `hushi.p2.leave` | 「先在纽约住下，把书写完再说」 | 1915 年即入哥伦比亚 |
| `hushi.p3.return` | 「留下」→ 结局《吾乡真在何处》 | 1917 年归国 |
| `hushi.p4.sacrifice` | 「再辞一次」→ 结局《均不能满意》 | 1938.9 赴任驻美大使 |
| `hushi.p5.pier` | 「同她上船去」→ 结局《逃兵》 | 送冬秀赴台，自己留下 |
| `hushi.end-stay` | 结局《留下》 | 分支收束，非史实终点 |

**刻意不写的内容**

- **1910 年赴美**：胡适自序明写「一九一〇年八月以后，有日记，遗失了」，全库无原文 → 只由 1911 倒叙带过，不做写实场景。
- **曹诚英**：全库 4603 篇检索「曹诚英 / 珮声 / 诚英」**零命中** → 本作不写。
- **韦莲司的情感**：实名高频出现，但二人情感在原文中**始终未点破** → 保持留白，不点破。

**一处底本异文**：《文学改良刍议》在 `939_卷十五` 底本中作「**私**议」，全库检索「刍议」零命中；
通行文献均作「刍议」。本作正文用通行名，并在 `content/hushi.js` 文件头与场景注释标明底本异文，
**不拿它当"胡适写错了"的梗使用**。

**OCR 卷引用政策**：OCR 卷（1919—1949 / 1954—1962）识别率 95—97% 且未校对，只取无歧义短句；
讹字（如「今口起」→「今日起」、「见届」→「见畀」）改写为正确写法而不臆测补全；
回避 1919/1920（流水账）、1924—1927（分篇崩坏）、1941/1948/1949（残片）。

## 剧情线测试分层与覆盖门

"所有剧情线（主线 + 支线）都被测过"由四层 + 一个总门保证，新增内容包只把入口挂进 `start`（lint 可达性强制），就会自动进入覆盖范围：

| 层 | 脚本 | 覆盖什么 | 新增内容如何被纳入 |
| --- | --- | --- | --- |
| 结构 | `npm run lint:content` | 图论层：悬空/可达/结局判定/契约 | 自动（每次跑） |
| 状态 | `npm run test:traverse` | 从 entry DFS 全图：真实执行每条 goto 边、每个效果、每个条件 | 自动（可达结局进 reached 集合） |
| 路径 | `npm test` | 真实进程 spawn，逐条完整剧情线断言文本 | 新包深链结局（插件/多轮/计数类 traverse 到不了的）需补一条 e2e 直达，否则 coverage 红 |
| 转录 | `node tests/playthrough.mjs`（`--only=<id>` 跑单条） | 逐线实跑，stdout 剧本落盘（人工阅读留存） | 可随时跑 |
| **总门** | `npm run test:coverage` | 58 个结局逐个必须有 **T**（traverse）或 **E**（e2e）来源；双缺 → 退出码 1 并列出缺口，同时生成 `docs/TEST-COVERAGE.md` 矩阵 | 自动审计 + 明文清单 |

> 现状（2026-09-08）：**58 个结局全覆盖 58/58**（traverse 结构-状态覆盖 37；e2e 路径断言覆盖 34；并集 58）。
> 此前 9 条深链结局已由《藏晖室札记》的 e2e 补测与既有多轮测试补齐，双缺行为 0。

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
        goto: 'castle',                   // 跳转；特殊目标：'@restart' 全量重置回 entry、
                                          //          '@loop:<场景ID>' 时间循环部分重置（见下）
      },
    ],
  },
}
```

**特殊跳转目标与时间循环**（M11 起，引擎语义，非新 mode）：

- `goto: '@restart'` —— 状态全量重置回 `engine.entry`（重开一局）。
- `goto: '@loop:<场景ID>'` —— **部分重置**后跳转指定场景：状态回 `initial`，但
  `cordis.yml` `state.config.loopKeep` 声明的点路径前缀（如 `clues.loop`、`flags.loop`）
  从旧状态保留——"知识跨循环保留、消耗态每轮复原"。`state.reset({ keep })` 是其
  底层 API，`loopKeep` 缺省为空数组（= 全量重置，兼容 `@restart`）。
- 落地例：《子夜集》（content/loop.js）每夜以 `@loop:` 回到客舍清晨，线索
  `clues.loop.*` 跨夜保留、行动力 `loopMoves` 每夜复原；lint 校验 `@loop:` 目标
  场景必须存在，并把其当作可达边参与 BFS。

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

同一机制已落地第二种（trade 经营，见 plugins/trade.js）、第三种模式（diary 日记回溯，见 plugins/diary.js）
与第四种模式（dialogue 对话/谈判，见 plugins/dialogue.js，话题询问 + 注意点预算），
可继续扩展商店、解谜等 —— 引擎核心无需改动。

> **新增第四种 mode 时要改 4 个地方**（缺一不可，否则 lint/traverse 判不可达）：
> ① 新插件内 `ctx.on('scene/mode', ...)` 返回 truthy 接管；
> ② `scripts/lint-content.mjs` 的 `MODE_EDGES` 追加一行（跳转边计入可达性）；
> ③ `tests/traverse.mjs` 的 `MODE_NEXT` 追加一行（**与 lint 是两份独立的表，不共享**）；
> ④ `cordis.yml` 注册插件 + `state.initial` 声明所需字段。

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
- **插件级**（`npm run start:hmr`）：修改 `plugins/*.js` 时自动重新加载该插件（其他插件与玩家状态不受影响）。由官方 `@cordisjs/plugin-hmr` 提供 —— 该包未发布到 npm，本项目用 `npm run build:hmr` 从本地 `cordis-4.0.0-rc.9/packages/hmr` 源码构建到 `vendor/plugin-hmr`（源码放项目同级目录或项目内，见脚本内 `RELATIVE_SRC`）；它需要 `node --expose-internals` 才能访问 Node 内部模块加载器，未带该标志时启动器自动跳过。

**音效**：程序化合成（波形 sine/square/saw/triangle + ADSR 包络），无外部音频资源；订阅事件自动发声，可用 `DSE_MUTE=1` 静音，或在 `cordis.yml` 覆盖音色表。

**内置命令**：输入选项编号选择；`help` 帮助；`stats` 状态；`achievements` 成就；`quit` 退出；`save [位]` / `load [位]` / `slots` 存档。战斗场景内：`a` 攻击 / `d` 防御 / `r` 逃跑。经营场景内：`buy <商品> [数量]` 进货 / `sell <商品> [数量]` 出货 / `next` 下一天 / `info` 行情。对话场景内：`ask <话题编号或名称>` 询问 / `topics` 话题列表 / `end` 结束对话。

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
10. **`state.apply` 对数值是"加减"语义，不是赋值**（M8 经营插件实测）：`apply({ tradeDay: 2 })` 会让天数 +2 而不是置 2（1 → 3）。凡要"设置一个数"的插件内部逻辑，必须走 `state.set`；`apply` 只用于玩家内容里的 `do: { hp: -5 }` 这类增减。同类陷阱：给场景"本金"写 `do: { gold: 30 }` 实际是 +30，应按文案写成增量或改由插件记录基线。
11. **战斗数值要按"入口状态"标定**（M9 实测）：Boss 若按"满装备玩家"设计数值，对从该线入口进来的无武器玩家可能 RNG 必输——e2e 会翻车。新内容线的敌人强度应以"该线入口时玩家的最低状态"为基准标定。
12. **模式扩展点（scene/mode）的校验器支持是表驱动**：`scripts/lint-content.mjs` 的 `MODE_EDGES = { battle: [...], trade: ['onEnd'] }` 同时驱动悬空检查、BFS 可达、结局判定三处；新增第四种 mode 只需追加一行，别在三处各写一遍。
13. **e2e 的 `choose()` 取"最后一个"匹配项**：条件互斥但文本相同的选项（如结算场景三个"（听结果）"）会被误选——这类场景改用 `g.send('1')`（条件过滤后只剩一个）；选项关键字必须与内容原文逐字一致（"沿回廊"与"沿着回廊"差一字就匹配不到）。

## 退出机制

游戏退出时不调用 `process.exit()`，而是设置 `process.exitCode = 0` 后主动 dispose 根作用域，由 Node 在句柄清空后自然退出。收益有三：

1. cordis 的清理 effect 得以执行 —— 音效临时 WAV 不再残留在系统临时目录（实测 5 个 → 0 个）
2. 输出不被截断 —— `npm start > log.txt` 尾部完整
3. 引擎可嵌入宿主程序，不再强行终结进程

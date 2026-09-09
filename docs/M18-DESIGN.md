# M18 设计稿：DLC 双生（D1 古堡前史《筑堡者》/ D2 星港第二季《回声》）

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **设计稿（落地版），两内容包随本稿同步产出** |
| 前序 | PHASE5-CONTENT-PLAN.md §6.2；铁律④：**本体已完整、DLC 平行加法、不改本体结局意义、游戏内标注扩展** |

---

## 1. D1 古堡前史《筑堡者》

### 1.1 立意

古堡主线（demo/demo-deep）已完整（ending.sword 等 4 结局）。DLC 回到建堡年代：**堡成之日，三子各执一剑之念——长子要封剑镇堡、次子要铸剑开锋、三子要毁剑藏锋**。诅咒起于这一夜。前传，不影响本体。

### 1.2 场景清单（15）

| 组 | ID | 作用 |
|---|---|---|
| 序 | `castle-pre.start` | 建堡年代应招做工 |
| hub | `castle-pre.hub` | 工地枢纽（三子/工匠/祭师） |
| 分线 | `castle-pre.first` / `.second` / `.third` | 三子各执一念 |
| 伏笔 | `castle-pre.mason`（堡基下埋着什么）/ `.oldman`（诅咒预言）/ `.dig`（掘出旧物：银匕首） |
| 勘验 | `castle-pre.forge`（剑成两半伏笔）/ `.shrine`（封剑台）/ `.crypt`（石像鬼雏形） |
| 瓶颈 | `castle-pre.fork` | 三子之争，玩家定夺 |
| 结局 | `castle-pre.end-seal`（封印）/ `end-split`（断剑）/ `end-burial`（埋剑） | 各含本体预言 |

### 1.3 结局（3）

| 结局 | 触发 | 本体预言（写进结局文本） |
|---|---|---|
| `end-seal` | 支持长子 | 剑封于台——千年后失落之剑仍在堡中（本体寻剑） |
| `end-split` | 支持次子 | 剑断两半——本体"剑被分成两半"的真相（swordLore） |
| `end-burial` | 支持三子 | 剑埋地宫——本体地下层灰与封印钥匙的由来 |

### 1.4 状态

- `flags.castlePre: {}`（中间层：听三子/工匠/祭师的节拍标记）
- 结局分流在 `castle-pre.fork` 直接三选一（无计数门槛，DLC 短平快）

## 2. D2 星港第二季《回声》

### 2.1 立意

星港两案（starport-case/case2）已完整。DLC 新案：**调度长老贾溺毙第七码头**，表面失足。真凶副手小崔——伪造调度单走私（呼应第一案走私线），被老贾发现，推其入海。案名"回声"：旧案的余波卷出新案。

### 2.2 场景清单（18）

| 组 | ID | 作用 |
|---|---|---|
| 序 | `echo.start` | 第七码头接报 |
| hub | `echo.hub` | 案卷桌（spoke + 条件门） |
| spoke | `echo.dock`（现场）/ `.office`（调度室）/ `.clerk`（副手小崔，真凶）/ `.crew`（船员证词）/ `.ledger`（账房）/ `.market`（黑市）/ `.beacon`（灯塔目击） |
| 勘验 | `echo.slip`（铁证1：调度单笔迹伪造）/ `.tide`（铁证2：潮位不符非失足）/ `.account`（铁证3：走私分账） |
| 终审 | `echo.deduce`（推理台）/ `echo.accuse`（指认可错） |
| 结局 | `echo.end-truth`（真凶归案）/ `end-wrong`（冤案）/ `end-open`（悬案）/ `end-echo`（回声：放过真凶，旧案余波） |

### 2.3 结局（4）

| 结局 | 触发 | 情感落点 |
|---|---|---|
| `end-truth` | `echoEvidence >= 2` 指小崔 | 调度单伪造+潮位+分账三铁证 |
| `end-wrong` | 指错（船员老何） | 冤案 |
| `end-open` | 退堂 | 悬案 |
| `end-echo` | 指小崔但放他走（呼应第一案"证据不足放人"的历史） | 真相的余波 |

### 2.4 状态

- `echoEvidence`：0（三铁证计数，>=2 可定罪）
- `echoClues: {}`（中间层：dock/office/crew/ledger/market/beacon/slip/tide/account）
- `flags.echo: {}`（中间层：autopsy 等节拍）

## 3. 共同验收

1. 两 DLC 独立可通关；lint 0 错 0 警；结局全可达
2. e2e 各 1 条全路径；coverage 双缺 0
3. **本体结局在有无 DLC 下意义不变**（DLC 不改本体任何状态读写）
4. 入口文本标注"DLC·平行扩展"；文件头注明本体已完整

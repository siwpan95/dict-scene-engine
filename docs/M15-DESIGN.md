# M15 设计稿：中篇三联（N1 雪庄·八客 / N2 渡口·子丑 / N3 戍卒·家书）

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **三中篇全部落地（2026-09-09）：N1 雪庄 22 场景/5 结局、N2 渡口 15 场景/4 结局（dialogue mode）、N3 戍卒 19 场景/4 结局；lint 0 错 0 警；待 e2e/coverage 收口** |
| 前序 | PHASE5-CONTENT-PLAN.md §6.4（中篇骨干，补最大结构缺口） |
| 体例 | 仿 M14-HUSHI-DESIGN.md（结构 / 场景清单 / 结局矩阵 / 状态 / 验收） |
| 规模口径 | 中篇 = 15–25 场景 / 3.5–5.5k 字 / 3–5 结局 / 30–60 分钟 |

---

## 0. 定位

Phase 5 骨干里程碑：把中篇从 1 个标杆（《江畔·县志》）扩到 4 个（+N1/N2/N3）。三条线各自验证一个中篇结构范式，且互不重复：

| 线 | 范式 | 机制 | 引擎改动 |
|---|---|---|---|
| N1 雪庄·八客 | 暴风雪山庄本格（封闭空间 + 不在场 + 指认纠错） | 仿 river 证据计数 + 指认可错 | 无（纯内容层） |
| N2 渡口·子丑 | 同一夜多视角（key nodes 网状） | dialogue mode 多角色 + flags.pov | **dialogue mode（前置）** |
| N3 戍卒·家书 | 双篇章历史（记篇当下 + 忆篇追忆） | flags.chap 切换 + items 信物跨篇 | 无（纯内容层） |

落地顺序：N1（纯内容层，先验证结构）→ dialogue mode 引擎增强 → N2（验证 mode）→ N3。

---

## 1. N1《雪庄·八客》——暴风雪山庄本格中篇

### 1.1 立意

风雪封山，雪庄主人言老太爷邀八位故旧赏梅。翌晨言老太爷暴毙于书房，八客皆困庄中。**公平推理**（依据③《景安区奇案》）：所有破案依据在前期七客对话与勘验中完整呈现，结局靠玩家拼合。

### 1.2 真凶与铁证（设计机密，写入文件头注释）

- **死者**：言老太爷（雪庄主人，丝绸巨商）。
- **真凶**：账房柳七。二十年前言老太爷侵吞其父丝绸庄，柳七隐姓埋名入言家做账房十年，雪夜以"驱鼠"为名购砒霜，案发当夜下于言老太爷的醒酒汤。
- **铁证三**（`snowEvidence` 计数 ≥2 可当堂定罪）：
  - `snowClues.forgery`：言家现账与柳父旧账的笔迹/数字比对（夜探账房暗格）
  - `snowClues.ledger`：柳七随身暗格里柳父丝绸庄的旧账册，亏空数目与言家"二十年前突然暴富"对得上
  - `snowClues.arsenic`：庄里药柜账——上月"驱鼠砒霜"凭柳七手记领走，在言老太爷死前两日
- **误导动机**：镖师赵大刀（言老太爷赖其一笔镖银三年未还）、外室苏娘（言老太爷始乱终弃）。各有各的"像凶手"。
- **支撑线索**（开路不计数）：郎中孙大夫验出"非急症、胃有砒霜之味"（开 `snow.court` 的门）、书童阿贵的时间线（言老太爷夜里独饮醒酒汤）。

### 1.3 场景清单（20 场景）

| 组 | ID | 作用 | 状态变更 |
|---|---|---|---|
| 序幕 | `snow.start` | 风雪封山，抵雪庄，言老太爷邀赏梅 | — |
| hub | `snow.hub` | 翌晨庄主暴毙，庄主厅 hub（列七客 spoke + 条件门 court） | `flags.snow.scene1` |
| spoke×7 | `snow.bailiff` | 账房柳七（真凶）——给假不在场 + 暗示账目 | `snowClues.bailiff` |
| | `snow.escort` | 镖师赵大刀（误导）——赖镖银动机 + 不在场可疑 | `snowClues.escort` |
| | `snow.concubine` | 外室苏娘（误导）——负情动机 | `snowClues.concubine` |
| | `snow.adviser` | 幕僚陈先生（知情）——暗示"账上有旧账" | `snowClues.adviser` |
| | `snow.tenant` | 佃户老王（动机）——兼并田地，但案发夜在外院守夜 | `snowClues.tenant` |
| | `snow.doctor` | 郎中孙大夫——验出非急症、胃有砒霜味（开 court 门） | `flags.snow.autopsy` |
| | `snow.page` | 书童阿贵——时间线（言老太爷独饮醒酒汤） | `snowClues.page` |
| | `snow.nephew` | 远房侄言明——继承人动机，但案发夜与陈先生同房对弈 | `snowClues.nephew` |
| 勘验 | `snow.account` | 夜探账房暗格（铁证 forgery） | `snowClues.forgery` +1, `snowEvidence` +1 |
| | `snow.secret` | 柳七随身的父亲旧账册（铁证 ledger） | `snowClues.ledger` +1, `snowEvidence` +1 |
| | `snow.pharmacy` | 庄里药柜账（铁证 arsenic） | `snowClues.arsenic` +1, `snowEvidence` +1 |
| 终审 | `snow.court` | 指认台（按 `snowEvidence` 分流） | — |
| 挫败 | `snow.blowback` | 指柳七无据被反制 → 回查 / 灭口 | — |
| | `snow.court-zhao` | 指错赵大刀 → 翻案回查 / 将错就错 | — |
| | `snow.court-su` | 指错苏娘 → 翻案 / 将错就错 | — |
| 结局 | `snow.end-truth` | 铁证定谳（真） | @restart |
| | `snow.end-wrong-zhao` | 冤狱·赵 | @restart |
| | `snow.end-wrong-su` | 冤狱·苏 | @restart |
| | `snow.end-open` | 疑案（退堂不指认，雪化后八客散去） | @restart |
| | `snow.end-silenced` | 被灭口（无凭硬指柳七，反被柳七灭口） | @restart |

> 合计 20 场景（序幕 1 + hub 1 + spoke 8 + 勘验 3 + 终审 1 + 挫败 3 + 结局 5 - 重叠）。`flags.snow.autopsy`（郎中验尸）为 `snow.court` 的进入条件。

### 1.4 结局矩阵

| 结局 | 触发 | 情感落点 |
|---|---|---|
| `snow.end-truth` | `snowEvidence >= 2` 且指柳七 | 柳七二十年隐忍复仇的悲怆；言家账上的旧债 |
| `snow.end-wrong-zhao` | 指赵大刀且将错就错 | 赖账的反被栽赃；柳七隐姓得逞 |
| `snow.end-wrong-su` | 指苏娘且将错就错 | 负情的反被冤；真凶深藏 |
| `snow.end-open` | 退堂 | 雪化八客散，旧账永沉雪庄 |
| `snow.end-silenced` | 无凭硬指柳七 | 知道太多反被灭口 |

### 1.5 状态清单（进 NARRATIVE-LEDGER §1）

- `snowEvidence`：0（数值，铁证计数，≥2 可定罪）
- `snowClues: {}`（中间层，snowClues.forgery/ledger/arsenic/bailiff/escort/.../page/nephew）
- `flags.snow: {}`（中间层，flags.snow.autopsy/scene1）

### 1.6 验收

1. lint 0 错 0 警（悬空/可达/账本/契约）
2. 5 结局全可达；e2e 新组覆盖真结局 + 冤狱 ×2 + 疑案 + 灭口
3. 公平推理：所有定罪铁证在七客对话/勘验中呈现，结局不追加关键信息
4. 指认可错：错指走挫败点可回 hub 纠错（证据保留）
5. 关键选择 ≥6；情节密度 0.6–1.2

---

## 2. N2《渡口·子丑》——同一夜多视角中篇（用 dialogue mode）

### 2.1 立意

一座渡口，一夜之间。**子时**（船夫视角）与**丑时**（更夫视角）两条线，各自只看见事件的一半，拼合才见全貌。对标 428 严格因果 + key nodes 结构（依据⑤⑥）。

### 2.2 dialogue mode 用法

- 每个 POV 是一个 `mode: 'dialogue'` 场景，由 `plugins/dialogue.js` 接管：呈现该视角的对话/所见，玩家选择"留意什么/追问什么"，消耗该视角的"注意点"。
- `flags.pov` 标记当前视角；`flags.hour` 标记时辰；时序锁 `if: flags.hour >= N`。
- 两视角信息互补：子时船夫听见的对话，在丑时更夫视角被另一人复述，玩家拼出矛盾。

### 2.3 场景清单（~20，设计意图级）

| 组 | 场景 | 作用 |
|---|---|---|
| 循环壳 | `crossing.start` / `crossing.dock` | 抵渡口，夜起雾 |
| 子时 POV | `crossing.zi`（dialogue mode）+ `crossing.zi.boat`/`.voice`/`.wake` | 船夫视角：渡客夜话、江上异响、有人落水？ |
| 丑时 POV | `crossing.chou`（dialogue mode）+ `crossing.chou.bell`/`.alley`/`.body` | 更夫视角：打更、巷中影、清晨浮尸 |
| key nodes | `crossing.bell`/`crossing.body` | 众见节点（钟声、浮尸）两视角都到 |
| 汇流 | `crossing.merge` | 集齐两 POV 碎片，拼出真相 |
| 结局×4 | `crossing.end-truth`/`end-half`/`end-wrong`/`end-loop` | 真相/只拼一半/指错/雾锁渡口 |

### 2.4 状态

- `flags.pov`（'zi'/'chou'）、`flags.hour`（0/1/2）、`crossingClues: {}`（zi.*/chou.*）、`crossEvidence: 0`

### 2.5 验收

- dialogue mode 接管正常；两 POV 各自可独立通关到 POV 结局；汇流结局需两 POV 关键 flag；时序锁无死锁。

> 详细设计稿在 dialogue mode 落地后补全。

---

## 3. N3《戍卒·家书》——双篇章历史中篇

### 3.1 立意

对标《哀鸿·城破十日记》双篇章（依据②）。**记篇**=边塞戍卒当下（烽火、巡城、同袍生死）；**忆篇**=家书往来（故乡、妻儿、期许）。一封家书跨两篇，意义翻转。

### 3.2 结构

- `flags.chap` 切换篇章（'record'/'memory'）。
- 记篇 gauntlet（线性生存线，资源管理：粮水/同袍数）；忆篇 branch（情感线，关系 flag）。
- 信物 `items.letter`（家书）在两篇皆被读取——记篇里它是裹粮的旧纸，忆篇里它是未寄出的念想。

### 3.3 场景清单（~20，设计意图级）

| 组 | 场景 | 作用 |
|---|---|---|
| 序 | `garrison.start` | 入边塞，分篇章入口 |
| 记篇 | `garrison.record.*` ×6 | 烽火、巡城、同袍伤、断水、突围、夜战 |
| 忆篇 | `garrison.memory.*` ×6 | 家书抵、妻儿念、归期误、田里荒、邻人言、诀别书 |
| 汇流 | `garrison.merge` | 信物贯穿，两篇 flag 汇合 |
| 结局×4 | `garrison.end-hold`/`end-fall`/`end-home`/`end-ash` | 死守/城破/归乡（忆篇成谶）/灰烬 |

### 3.4 状态

- `flags.chap`、`garrison.record: {}`、`garrison.memory: {}`、`items.letter`、`garrisonRations`/`garrisonComrades`（数值）

### 3.5 验收

- 信物在两篇皆被读取；两篇对照情感落点（残酷现在 vs 唯美追忆）；4 结局全可达。

> 详细设计稿在 N2 之后补全。

---

## 4. M15 共同验收

1. 三线各自独立可通关（e2e 至少 1 全路径 + 全结局可达）
2. `lint:content` 0 错 0 警
3. `npm test` 全绿（e2e 558 + 新增 M15 组）；coverage 不回归（58/58 → 新增结局全覆盖）
4. NARRATIVE-LEDGER 同步登记 N1/N2/N3 全部状态
5. cordis.yml packs + state.initial + achievements 同步
6. 单 commit / 单里程碑（M15），便于回滚

# 叙事账本（NARRATIVE-LEDGER）

> 内容状态变量的**唯一权威清单**。每个变量必须标注**写入处**与**读取处**。
>
> 铁律：**若某个变量不被任何场景读取（对话/通道/情绪/结局），就从内容里删掉。**
> `npm run lint:content` 会自动校验账本与内容的一致性（未声明的引用、声明后未被读取的死变量）。

维护时机：每次新增/修改场景的状态读写，同步更新本文件。

---

## 1. 状态清单

### 1.1 flags（布尔标记）

| 路径 | 含义 | 写入处 | 读取处 |
|---|---|---|---|
| `flags.knowWeakness` | 知道"商人怕还价" | `gossip` onEnter、`village.tavern.rumor` 选项 | `road.merchant` 选项「五枚，不然算了」条件 |
| `flags.starportIntel` | 买到"守卫换班空档"情报 | `starport-bar` onEnter | `starport-cargo` 选项「通风管道」条件 |
| `flags.arenaChampion` | 通关试炼场石像鬼 | `arena-boss-win` onEnter | `village.tavern` 选项「亮出试炼之王的身份」 |
| `flags.intelBought` | 酒馆买到古堡守卫换班情报 | `village.tavern` 选项 | `castle` 瓶颈节点「等空档溜进去」条件 |
| `flags.hasAlly` | 雇佣佣兵同行 | `village.tavern` 选项 | `road.ambush`、`village.tavern.rumor`（佣兵忠告） |
| `flags.castleFrontal` | 亮兵器走正门进堡 | `castle` 选项 | `castle.hall` 选项「守卫忌惮你，肯指条明路」 |
| `flags.castleStealth` | 趁换班空档潜入 | `castle` 选项 | `castle.hall` 选项「趁守卫换班，搜刮大厅」 |
| `flags.hallLooted` | 大厅已搜刮过（防重复） | `castle.hall` 选项 | `castle.hall` 同选项条件 `!flags.hallLooted` |
| `flags.sawMural` | 看出壁画被刮掉的部分 | `castle.hall` 选项、`castle.hall.mural` | `castle.library` 解锁条件 |
| `flags.swordLore` | 知道"剑是被分成两半的"真相 | `castle.library` 选项 | `castle.sanctum` 选项「把断剑放回石台」→ BEST END 条件 |
| `flags.caseAccepted` | 已接下星港命案委托 | `case.brief` 选项 | `starport-hub` 入口选项、`case.board` 调查项条件 |
| `flags.cargoAccess` | 取得货舱进入权限 | `scene.dock`/`scene.cabin`/`crew.captain` 选项 | `case.board` 货舱项条件、`scene.cargo` 解锁 |
| `flags.linkManifestLog` | 已比对清单与日志 | `case.deduce` 选项 | 同选项条件（防重复） |
| `flags.linkWeaponRumor` | 已比对凶器与欠债 | `case.deduce` 选项 | 同选项条件（防重复） |
| `flags.linkTestimony` | 已比对三条证词 | `case.deduce` 选项 | 同选项条件（防重复） |
| `flags.linkScene` | 已比对现场与封条 | `case.deduce` 选项 | 同选项条件（防重复） |
| `flags.linkLetter` | 已核对信件与医生处境 | `case.deduce` 选项 | 同选项条件（防重复） |
| `flags.accused` | 被指认者的名字（用于结局回显） | `case.accuse` 各选项 | `ending.miscarry` 文本插值 `{flags.accused}` |
| `flags.underworldVisited` | 已进入地下层（防重复入口提示） | `castle.dungeon.after` 选项 | 同选项条件 |
| `flags.alchemistHeard` | 已听炼金术士讲故事 | `castle.underworld.alchemist` 选项 | 同场景后续选项条件 |
| `flags.safeMerge` | 知道"安全拼合"的方法 | `castle.underworld.alchemist.tale`/`.trade` | `ending.sword` 的隐含前置（影响拼合成败） |
| `flags.ghostHeard` | 已听管家讲"了结" | `castle.underworld.ghost` 选项 | 同场景后续选项条件 |
| `flags.knowSeal` | 知道"封剑"这个选项存在 | `castle.underworld.ghost.duty` 选项 | `castle.underworld.ghost.seal` 解锁条件 |
| `flags.knowSealMethod` | 知道封剑需要钥匙+留守 | `castle.underworld.ghost.seal` 选项 | `ending.sacrifice` 前置 |
| `flags.ghostCause` | 知道管家死因（反噬） | `castle.underworld.ghost.death` | 背景信息，暂无直接读取 |
| `flags.ghostSword` | 管家辨出你的武器是仿品 | `castle.underworld.ghost.sword` | 背景信息，暂无直接读取 |
| `flags.ashOffered` | 已将地下层灰撒入石台缝隙 | `castle.sanctum.ash` 选项 | `castle.sanctum.ash` 后续选项分支 |

### 1.2 items（物品，含武器加成）

| 路径 | 含义 | 获取处 | 读取处 | 战斗加成 |
|---|---|---|---|---|
| `items.rusty_sword` | 锈剑 | `road.merchant` 购买（10 金币／还价 5 金币） | `castle` 亮出武器条件 | ATK +4（combat.weapons） |
| `items.broken_sword` | 断剑 | `wolf-win` onEnter | `castle` 亮出武器条件 | ATK +2（combat.weapons） |
| `items.torch` | 火把 | `village.shop` 购买（3 金币） | `forest.ruins` 选项「点火把进去搜查」条件 | — |
| `items.relic` | 废墟里的青铜牌 | `forest.ruins.inside` onEnter | `road.merchant.relic`（商人收购／劝告）、`village.shop` 出售 | — |
| `items.wolf_pelt` | 狼皮 | `combat` 独眼狼掉落 | `village.shop` 出售（6 金币） | — |
| `items.silver_dagger` | 银匕首 | `castle.gallery` 壁龛（需火把） | `castle.sanctum` 选项「举起银匕首」 | ATK +3（combat.weapons） |
| `items.golem_core` | 石像鬼核心 | `combat` 石像鬼掉落 | `village.shop` 出售（40 金币） | — |
| `items.seal_key` | 封印钥匙（半透明，管家所赠） | `castle.underworld.ghost.seal` 选项 | `castle.sanctum` 选项「插入底座」→ `ending.sacrifice` |
| `items.underworld_ash` | 剑断时溅出的灰（碰之伤身） | `castle.underworld.alchemist.burn` onEnter | `castle.sanctum` 选项「灰与剑撒入缝隙」→ `castle.sanctum.ash` |
| `items.calm_potion` | 稳心剂（拼合时防反噬） | `castle.underworld.alchemist.trade` 选项 | `ending.sword` 隐含前置（影响拼合成败） | — |

### 1.3 数值

| 路径 | 含义 | 初值 | 主要写入处 | 主要读取处 |
|---|---|---|---|---|
| `hp` / `maxHp` | 生命 | 20 / 20 | 战斗、`forest` 等场景效果 | 战斗、结局判定 |
| `atk` | 基础攻击 | 3 | 无（靠武器加成） | 战斗公式 |
| `def` | 防御 | 2 | 无 | 战斗公式 |
| `crit` | 暴击率 | 0.15 | 无 | 战斗公式 |
| `gold` | 金币 | 10 | 战利品、出售、`road.merchant` 消费、酒馆 | 商店、贿赂、情报等条件选项 |
| `visits.village` | 村庄访问次数 | 0 | `village` onEnter | 后续重访反应（M2） |
| `suspectLevel` | 侦探 Mod 推理度（线索数） | 0 | 各线索 `do: { suspectLevel: +1 }` | `case.board` 标题插值、`case.accuse` 定罪条件（≥5） |

---

## 2. 结局条件矩阵

| 结局 | 场景 ID | 触发条件 | 所属 | 状态 |
|---|---|---|---|---|
| 剑主 | `ending-win`（M2 改 `ending.sword`） | 持剑 + `flags.swordLore` | 主线 | 现有 |
| 认主 | `ending-win`（M2 拆 `ending.claim`） | 持剑、无知 | 主线 | 现有 |
| 败亡 | `ending-lose` | hp ≤ 0 | 主线 | 现有 |
| 试炼场之殇 | `arena-lose` | 试炼场战败 | 支线 | 现有 |
| 试炼之王 | `arena-boss-win` | 击败石像鬼 | 支线 | 现有 |
| 星港结局 | `starport-win` | 取得数据核心 | Mod（星港） | 现有 |

> M2 补充：商人结局 `ending.merc`（持剑但选择出售）。
> M3 补充：侦探 Mod 的 `ending.truth` / `ending.miscarry`。

---

## 3. 命名规范

```
flags.<名词化的事实>     例：flags.intelBought、flags.swordLore
items.<snake_case>        例：items.rusty_sword
数值：<域>.<对象>         例：rep.village、visits.castle、suspectLevel
场景：<章节>.<地点>[.<子场景>]   例：castle.gallery、forest.ruins
结局：ending.<标识>        例：ending.sword、ending.truth
```

---

## 4. 校验

```bash
npm run lint:content
```

会检查：悬空 goto、不可达场景、结局可达性、未声明的变量引用、声明后从未被读取的死变量、过短场景、疑似假选择、ID 命名。

---

## 5. 规划中（尚未启用，不参与死变量校验）

> 这些变量属于 M2/M3 的设计意图，**接入内容后再移入 §1**。校验器只解析 §1，故不会误报。

| 路径 | 含义 | 计划写入处 | 计划读取处 | 阶段 |
|---|---|---|---|---|
| `items.potion` | 伤药（可服用） | `village.shop` | 服用机制（引擎待支持） | M2 评估 |

---


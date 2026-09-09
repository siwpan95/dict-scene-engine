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
| `flags.tradeLicense` | 持有七大城联号贸易牌照 | `caravan.trade` 选项 | `caravan.fork` 商队之王结局条件（需 + gold≥40） |
| `flags.helpedRefugee` | 收留过难民车队 | `caravan.camp` 选项 | `caravan.hermit` 善名线贡献（karma） |
| `flags.droveRefugee` | 驱赶过难民 | `caravan.refugee` 选项 | 恶名线（karma 负值） |
| `flags.heardMerchant` | 听过老商人提醒合伙人不可信 | `caravan.merchant` 选项 | `caravan.partner` 解锁前置 |
| `flags.heardScout` | 听过斥候火防沙盗的法子 | `caravan.scout` 选项 | 背景信息 |
| `flags.readLedger` | 查过账本，发现合伙人贪污 | `caravan.ledger` 选项 | `caravan.partner` 解锁条件 |
| `flags.metPartner` | 已与合伙人对峙 | `caravan.partner` 选项 | 同场景两项互斥（reformed/betrayed） |
| `flags.partnerReformed` | 原谅并立字据约束合伙人 | `caravan.partner` 选项 | 善名线（karma +1） |
| `flags.betrayedPartner` | 卷款独吞、背叛合伙人 | `caravan.partner` 选项 | 恶名线（karma -2） |
| `flags.smuggled` | 接过黑市走私的活 | `caravan.market` 选项 | 恶名线（karma -1） |
| `flags.reportedMarket` | 举报过黑市 | `caravan.market` 选项 | 善名线（karma +1） |
| `flags.sharedOasis` | 分水给穷人 | `caravan.oasis` 选项 | 善名线（karma +1） |
| `flags.hoardedOasis` | 抢水独享 | `caravan.oasis` 选项 | 恶名线（karma -1） |
| `flags.rodeStorm` | 沙暴中护住驼队 | `caravan.storm` 选项 | 善名线（karma +1） |
| `flags.racedStorm` | 沙暴中冒进致伤 | `caravan.storm` 选项 | hp -8（战斗外掉血） |
| `flags.leftRelic` | 未贪石堡铜符 | `caravan.ruin` 选项 | 善名线（karma +1） |
| `flags.heardSong` | 听过营火夜谈 | `caravan.song` 选项 | 角色厚度，暂无直接读取 |
| `flags.knowTeaFair` | 知道第 3 天茶会茶价看涨 | `town.tea` 选项 | `town.recon` 同选项条件（防重复） |
| `flags.knowRain` | 知道第 2 天雨天盐价看涨 | `town.rain` 选项 | `town.recon` 同选项条件（防重复） |
| `flags.knowMarket` | 知道第 5 天大集布价看涨 | `town.notice` 选项 | `town.recon` 同选项条件（防重复） |
| `flags.relicSold` | 铜符已卖给何掌柜的朋友 | `town.relic` 选项 | `town.settle` 入口选项条件（防重复） |
| `flags.relicKept` | 铜符留作念想未卖 | `town.relic` 选项 | `town.settle` 返回后的状态回显 |
| `flags.skippedRobbers` | 未管山贼拦路之事 | `wuxia.road` 选项 | 恶名线（karma -1） |
| `flags.savedOldMan` | 救下驴车上的老汉 | `wuxia.road.after` 选项 | 善名线（karma +1） |
| `flags.heardMonk` | 听过老僧的话 | `wuxia.temple.talk` 选项 | 同场景两选项互斥 |
| `flags.monkDeep` | 听老僧讲完了然 | `wuxia.temple.talk` 选项 | `wuxia.temple.answer` 解锁放下结局 |
| `flags.dirtyFight` | 对决前用了迷粉（阴损） | `wuxia.cliff` 选项 | `wuxia.cliff.after` 结局分流（毒结局） |
| `flags.gotLog` | 取得夜枭行为日志 | `scifi.core` 选项 | `scifi.core` 解锁呼叫夜枭项 |
| `flags.metAI` | 已与夜枭对话 | `scifi.ai` 选项 | `scifi.decide` 共存/迷失选项条件 |
| `flags.gotVoice` | 取得实验室录音 | `scifi.lab` 选项 | 证据计数 sciEvidence |
| `flags.gotCall` | 拷贝舰桥求救记录 | `scifi.bridge` 选项 | 证据计数 sciEvidence |
| `flags.gotCandle` | 厨房拿到蜡烛 | `horror.kitchen` 选项 | 同场景防重复、后门选项条件 |
| `flags.gotClue1` | 阁楼箱子线索 | `horror.attic` 选项 | 线索计数 horrorEvidence |
| `flags.gotClue2` | 东厢房日记线索 | `horror.bedroom` 选项 | 线索计数 horrorEvidence |
| `flags.metGhost` | 走到回廊尽头见到宅灵 | `horror.backdoor` 选项 | `horror.cellar` 入口 |
| `flags.gaveCandle` | 把蜡烛交给宅灵 | `horror.cellar` 选项 | `horror.end-master` 宅主结局 |
| `flags.case2Accepted` | 已接下第二案（港务官中毒）委托 | `case2.brief` 选项 | `starport-hub` 入口选项、`case2.board` 调查项条件 |
| `flags.case2accused` | 第二案被指认者（用于结局回显） | `case2.accuse` 各选项 | `case2.ending.miscarry` 文本插值 |
| `flags.loop.n` | 《子夜集》当前是第几个夜晚（时间循环计数） | `loop.start` 选项、`loop.awaken` 睡去选项 do `+1` | `loop.awaken` 标题/文本插值与条件（≥3 开祠堂密龛、≥6 永夜） |
| `flags.post.adviceStay` | 《驿路》第一夜劝阿萤留下 | `post.night` 选项 | `post.morning` 帮药选项条件 → 留灯线 |
| `flags.post.adviceGo` | 《驿路》第一夜支持阿萤出去看看 | `post.night` 选项 | `post.morning` 同行选项条件 → 出关线 |
| `flags.post.asked` | 《驿路》问过那只空茶碗在等谁 | `post.evening` 选项 | `post.last` 冷线选项否决条件（有交情则不开） |
| `flags.post.help` | 《驿路》替老秦垫药钱（5 金） | `post.morning` 选项 | `post.last` 留灯选项条件（adviceStay+help） |
| `flags.post.promise` | 《驿路》许诺带阿萤走出荒驿 | `post.morning` / `post.ridge` 选项 | `post.last` 同行选项条件 |
| `flags.river.autopsy` | 《江畔·县志》验尸定论：非溺死、胃有砒霜 | `river.clinic` 选项 | `river.hub` 上堂选项条件 |
| `flags.river.blocked` | 《江畔·县志》索阅《河工卷》被主簿拦下 | `river.yamen` 选项 | `river.yamen` 夜探选项条件（被拒后解锁） |
| `flags.river.sawScribe` | 《江畔·县志》找书办宋七坐过 | `river.yamen` 选项 | `river.yamen` 后续选项去重 |
| `flags.lantern.red` | 《千灯》系过红绳愿 | `lantern.red` 选项 | `lantern.shop`/`lantern.ask` 红绳选项去重 |
| `flags.lantern.river` | 《千灯》放过河灯愿 | `lantern.river` 选项 | `lantern.shop`/`lantern.ask` 河灯选项去重 |
| `flags.noodle.soldier` | 《深夜面摊》与巡夜老卒攀谈过 | `noodle.soldier` 选项 | `noodle.bowl` 选项去重 |
| `flags.noodle.book` | 《深夜面摊》与赶考书生说过话 | `noodle.book` 选项 | `noodle.bowl` 选项去重 |
| `flags.noodle.singer` | 《深夜面摊》给卖唱姑娘倒过水 | `noodle.singer` 选项 | `noodle.bowl` 选项去重 |
| `flags.hushi.questionWord` | M14《藏晖室札记》1914 总纲之问的答案（`'both'` = 原文答案「家庭从东方、政治从西方」） | `hushi.p2.question` 第三选项 | `hushi.p5.cards` 真结局选项条件 |
| `flags.hushi.haven` | M14 住进 92 Haven Ave（本韦女士旧寓） | `hushi.p3.haven` 选项 | `hushi.p3.diaries` 选项条件 |
| `flags.hushi.eightFocus` | M14 把八事中「不避俗字俗语」单独提出另作一文 | `hushi.p3.eight` 第三选项 | `hushi.p3.essay` 第三选项条件 |
| `flags.hushi.accepted` | M14 1938 拟电**允**就大使职 | `hushi.p4.telegram` 第二选项 | `hushi.p4.sacrifice` 第三选项条件 |
| `flags.hushi.declined` | M14 1938 拟电**辞**大使职 | `hushi.p4.telegram` 第一选项 | `hushi.p4.sacrifice` 第四选项条件 |
| `flags.hushi.tookPost` | M14 1938 赴任驻美大使 | `hushi.p4.sacrifice` 第一选项 | `hushi.p5.cards` 结局分流（end-sacrifice / end-decline） |
| `flags.hushi.willGo` | M14 1949.1.8 总统官邸答应出去看看 | `hushi.p5.mansion` 第一/三选项 | `hushi.p5.pier` 第三选项条件 |
| `flags.hushi.sawWifeOff` | M14 1949.1.21 同冬秀上船赴台〔虚构分支〕 | `hushi.p5.pier` 第二选项 | `hushi.p5.cards` 结局分流（end-deserter） |
| `flags.hushi.remonstrated` | M14 1953 当面进逆耳之言（诤臣一百人） | `hushi.p5.remonstrate` 第一/三选项 | `hushi.p5.cards` 结局分流（end-remonstrator） |
| `flags.snow.autopsy` | M15 雪庄八客 郎中验出砒霜、开堂对质之门 | `snow.doctor` 选项 | `snow.hub` 选项「查得够了——当厅对质」条件 |
| `flags.garrison.chap` | M15 戍卒家书 当前篇章（'record'/'memory'） | `garrison.start` 两选项、`garrison.hub.record`/`.memory` 切换项 | 两 hub 的切换项判断（写入值本身） |
| `flags.garrison.sawGap` | M15 巡城记下西北角缺口 | `garrison.record.wall` 选项 | 背景信息，暂无直接读取 |
| `flags.garrison.hold` | M15 夜战选择死守 | `garrison.record.night` 第一选项 | `garrison.merge` 死守结局条件（hold+keep） |
| `flags.garrison.break` | M15 夜战选择突围 | `garrison.record.night` 第二选项 | `garrison.merge` 归乡结局条件 |
| `flags.garrison.fall` | M15 夜战溃散城破 | `garrison.record.night` 第三选项 | `garrison.merge` 城破结局条件 |
| `flags.garrison.keep` | M15 诀别半页纸留好 | `garrison.memory.farewell` 第一选项 | `garrison.merge` 死守结局条件（hold+keep） |
| `flags.garrison.burn` | M15 诀别半页纸烧了 | `garrison.memory.farewell` 第二选项 | `garrison.merge` 灰烬结局条件 |
| `flags.garrison.recordDone` | M15 记篇走完（夜战三选一后） | `garrison.record.night` 三选项 | `garrison.hub.record` merge 入口条件（+memoryDone） |
| `flags.garrison.memoryDone` | M15 忆篇走完（诀别二选一后） | `garrison.memory.farewell` 两选项 | `garrison.hub.record` merge 入口条件（+recordDone） |
| `flags.echo.autopsy` | M18 星港回声 调度册签名可疑、开问案之门 | `echo.office` 拓签名选项 | `echo.hub` 选项「证据够了——当面问案」条件 |
| `flags.grad.said` | M19 毕业那年 把字条上的话说出了口 | `grad.letter` 第一选项 | `grad.merge` 追上去结局条件 |
| `flags.siege.hold` | M20 城破 夜战选择死守 | `siege.record.break` 第一选项 | `siege.merge` 死守/城破分流（+morale 判） |
| `flags.siege.hide` | M20 城破 选择密道出城 | `siege.record.break` 第二选项 | `siege.merge` 出城结局条件 |
| `flags.siege.ash` | M20 城破 选择焚城 | `siege.record.break` 第三选项 | `siege.merge` 焚城结局条件 |
| `flags.siege.recordDone` | M20 城破 记篇走完（破城三选一后） | `siege.record.break` 三选项 | `siege.record.hub` merge 入口条件 |
| `flags.siege.memory.debt` | M20 城破 忆篇欠债已想 | `siege.memory.debt` onEnter | `siege.merge` 余生结局条件（+love+friend） |
| `flags.siege.memory.love` | M20 城破 忆篇心上人已想 | `siege.memory.love` onEnter | `siege.merge` 余生结局条件 |
| `flags.siege.memory.friend` | M20 城破 忆篇友人已想 | `siege.memory.friend` onEnter | `siege.merge` 余生结局条件 |
| `flags.changan.ready` | M20 长安西市 铁证/消息到手、开对质之门 | `changan.bosi`/`.pawn`/`.tea` 选项 | `changan.cross` 对质选项条件 |

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
| `items.caravan_map` | 古商道图（沙丘秘道） | `caravan.dunes` 选项 | `caravan.camp` 解锁「石堡遗迹」项、`caravan.ruin` 入口 |
| `items.relic_charm` | 石堡铜符（旧物） | `caravan.ruin` 选项 | `town.settle` 入口选项条件、`town.relic`（M10 跨包联动：持符可在东市卖 30 金） |
| `items.blade` | 旧刀（师门遗物） | `start` 入口选项 | 战斗 ATK+4（combat.weapons） |
| `items.antidote` | 解药（防陈九爪毒） | `wuxia.town` 选项（10 金） | `wuxia.cliff` 阴损选项条件 |
| `items.candle` | 蜡烛（古宅行动次数） | `horror.start`/`horror.kitchen` 选项 | `horror.hall` 各选项条件、`horror.cellar` 宅主结局 |
| `items.photo` | M14 全家福照片（吾母与冬秀皆在焉） | `hushi.p2.photo`/`hushi.p2.letter` 选项 | `hushi.p2.letter` 第三选项条件（另写信托付本人） |
| `items.willow` | M14 垂柳图（折柳赠别；含雪中之柳则 +2） | `hushi.p2.willow` 第一/二选项 | `hushi.p2.leave` 第一选项条件 |
| `items.letters` | M14 致韦女士旧函百余封（**解锁日记回溯关卡**） | `hushi.p3.diaries` 第一选项 | `hushi.p3.diaries`/`hushi.p3.return` 的 `hushi.diary2` 入口条件 |
| `items.milk_receipt` | M14 北大农学院牛奶收据破纸（￥440 / 31 瓶） | `hushi.p5.milk` 第一选项 | `hushi.p5.remonstrate` 第四选项条件 |
| `items.letter` | M15 戍卒家书（妻捎来的信，贴身三年，跨两篇章信物） | `garrison.start` onEnter | `garrison.hub.record` 选项「把家书摸出来，再念一念」条件 |
| `items.gear_wedge` | M19 机巧阁 木楔（开无眼锁，进门后消耗） | `gear.gate` 选项 | `gear.gate` 选项条件（防重复）、`gear.gate.open` onEnter 消耗 |
| `items.gear_gear` | M19 机巧阁 铜齿轮（开楼梯栅门，装上后消耗） | `gear.wheel` 选项 | `gear.hall` 选项「装进楼梯口的槽」条件 |
| `items.gear_spring` | M19 机巧阁 机簧（开天工匣） | `gear.hall2` 选项 | `gear.top` 开匣选项条件 |
| `items.gear_axle` | M19 机巧阁 玉轴（开天工匣） | `gear.clock` 选项 | `gear.top` 开匣选项条件 |
| `items.halfJade` | M20 城破记与忆 半块玉佩（跨两篇章信物） | `siege.start` onEnter | `siege.record.hub` 选项「摸出半块玉佩」条件 |

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
| `karma` | 商队线善恶值 | 0 | `caravan.*` 各选项 ±1/±2 | `caravan.camp` 标题插值、`caravan.fork` 隐者线条件（≥2） |
| `stock.*` | 东市经营库存（茶/盐/布） | `{}` | `trade` 插件 buy/sell | `trade` 插件面板显示 |
| `tradeDay` | 东市经营天数 | `null` | `trade` 插件 begin/next（⚠️ set 赋值，勿用 apply 加减） | `trade` 插件面板、收市判定 |
| `tradeBaseGold` | 东市开市基线资金 | `null` | `trade` 插件 begin | 收市时结算 `tradeProfit` |
| `tradeProfit` | 东市收市净赚 | 0 | `trade` 插件收市结算（gold − base） | `town.settle` 文本插值、`town.judge` 结局分流（≥60 / ≥10 / <10） |
| `loopMoves` | 《子夜集》每夜行动力 | 3 | `loop.awaken` 出门选项 `-1`（每处地点 1 分） | `loop.awaken` 各地点选项条件 `loopMoves >= 1`；`@loop:` 重置回 3 |
| `riveEvidence` | 《江畔·县志》铁证计数（forgery/ledger/arsenic） | 0 | 三处铁证 do `+1` | `river.court` 指认主簿条件 `>= 2`（否则走反噬/冤枉线） |
| `midEvidence` | M16《同一夜·十二时辰》关键追问计数（六块碎片拼合度） | 0 | 六个 dialogue 话题 do `+1`（最多 8） | `midnight.merge` 结局分流（>=4 真相 / 2-3 拼错 / <2 悬案） |
| `ferryEvidence` | M17《渡口纪年》关键追问计数（四段往事听全度） | 0 | 四个 POV 的 key 话题 + 老渡工话题 do `+1`（最多 9） | `ferry.merge` 结局分流（>=4 各渡各岸 / >=6+渡工 自渡） |
| `echoEvidence` | M18《星港·回声》铁证计数（slip/tide/account） | 0 | 三处勘验 do `+1` | `echo.accuse` 指认小崔条件 `>= 2`（否则走冤案/悬案/回声线） |
| `trust` | M19《茶肆·三遇》信任轴 | 0 | 各幕选项 ±1 | `tea.merge` 结局分流（>=2 且 closeness>=2 深交） |
| `closeness` | M19《茶肆·三遇》亲近轴 | 0 | 各幕选项 ±1 | `tea.merge` 结局分流（>=2 且 trust<2 温情告别） |
| `waterLeft` | M19《最后的水》剩余水量 | 2 | 分水选项 `-1` | `water.merge` 分水结局条件 `>= 1` |
| `siegeGrain` | M20《城破·记与忆》粮 | 3 | 分配/夜战 `-1` | 生存数值（记篇资源） |
| `siegeMorale` | M20《城破·记与忆》士气 | 3 | 守城选项 `±1` | `siege.merge` 死守结局条件 `>= 3`（否则城破） |
| `changanEvidence` | M20《长安·西市》铁证计数 | 0 | 三处铁证 do `+1` | `changan.accuse` 指认条件 `>= 2`（不足则惊蛇/悬案/受贿线） |
| `toleration` | M14《藏晖室札记》**为人的容忍**（Altruistic Toleration，为爱我者屈） | 0 | `hushi.*` 各幕选项 ±1/±2 | 幕内标题插值、`hushi.p5.cards` 真结局条件（≥3） |
| `independence` | M14《藏晖室札记》**不容忍**（对一己不可不诚，不可为人屈） | 0 | `hushi.*` 各幕选项 ±1/±2 | 幕内标题插值、`hushi.p5.cards` 真结局条件（≥3） |
| `cardsPlayed` | M14 与「牌」的纠葛次数（1911 打牌 → 1960 过五关，五十年呼应） | 0 | `hushi.p1.cards` 第一选项 `+1` | `hushi.p2.leave` 第二选项条件 |
| `diaryRead` | M14 日记回溯已读篇目 ID 数组（有序去重） | `[]` | `plugins/diary.js` 监听 `scene/enter` 追加 | `plugins/diary.js` 渲染目录（**只读重读，不回写状态**） |

---

## 2. 结局清单

> 结局判定口径与引擎/lint 一致：无选项，或所有选项都是"重开"（`@restart`）。
> 下表由场景字典导出（30 个，2026-09-07 核对），与 `npm run lint:content`
> 的"结局可达性"统计同源；内容改版后以字典为准，必要时用
> `node scripts/lint-content.mjs` 复核总数与可达性。

| 场景 ID | 所属 | 标题 |
|---|---|---|
| `arena-lose` | 主线 | 结局 · 试炼场之殇 |
| `ending-lose` | 主线 | 结局 · 荒山野岭 |
| `ending-win` | 主线 | 结局 · 剑之认主 |
| `starport-win` | 主线 | 结局 · 数据核心 |
| `case2.ending.miscarry` | case2 线 | 结局 · 连环案 · 冤判 |
| `case2.ending.truth` | case2 线 | 结局 · 连环案 · 真相 |
| `ending.caravan-broke` | ending 线 | 结局 · 商队散伙 |
| `ending.caravan-hermit` | ending 线 | 结局 · 绿洲隐者 |
| `ending.caravan-king` | ending 线 | 结局 · 商队之王 |
| `ending.merc` | ending 线 | 结局 · 好价钱 |
| `ending.miscarry` | ending 线 | 结局 · 冤案 |
| `ending.sacrifice` | ending 线 | 结局 · 献祭 |
| `ending.sword` | ending 线 | 结局 · 完整的剑 |
| `ending.truth` | ending 线 | 结局 · 真凶归案 |
| `ending.tyrant` | ending 线 | 结局 · 僭主 |
| `horror.end-dawn` | horror 线 | 结局 · 古宅 · 天亮 |
| `horror.end-eaten` | horror 线 | 结局 · 古宅 · 烛灭 |
| `horror.end-master` | horror 线 | 结局 · 古宅 · 宅主 |
| `horror.end-rain` | horror 线 | 结局 · 夜路 · 雨 |
| `scifi.end-coexist` | scifi 线 | 结局 · 远望七号 · 交易 |
| `scifi.end-escape` | scifi 线 | 结局 · 远望七号 · 弃站 |
| `scifi.end-fix` | scifi 线 | 结局 · 远望七号 · 重启 |
| `scifi.end-lost` | scifi 线 | 结局 · 远望七号 · 沉没 |
| `town.end-mid` | town 线 | 结局 · 东市 · 小本营生 |
| `town.end-poor` | town 线 | 结局 · 东市 · 铺子没保住 |
| `town.end-rich` | town 线 | 结局 · 东市 · 商会入主 |
| `wuxia.end-dead` | wuxia 线 | 结局 · 刀客 · 死 |
| `wuxia.end-letgo` | wuxia 线 | 结局 · 刀客 · 放下 |
| `wuxia.end-mutual` | wuxia 线 | 结局 · 刀客 · 毒 |
| `wuxia.end-vengeance` | wuxia 线 | 结局 · 刀客 · 了结 |

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


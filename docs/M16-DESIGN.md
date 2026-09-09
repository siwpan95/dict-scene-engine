# M16 设计稿：L1《同一夜·十二时辰》—— 群像多视角网状长线

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **设计稿（落地版），随 content/midnight.js 同步产出** |
| 前序 | PHASE5-CONTENT-PLAN.md §6.3-L1；dialogue mode（M15 落地）已就绪 |
| 对标 | 428 严格因果链 + 底特律多 POV 交织（调研 §4-⑥）；key nodes 结构（§4-⑤） |
| 规模 | 28 场景 / ~7k 字 / 6 结局（长线档 25-40 场景） |

---

## 1. 立意

花灯夜，城南丝绸商柳员外坠楼而死，县衙以「失足」结案。一夜六个时辰，六个人各自看见真相的一块。玩家沿子丑寅卯辰巳巡城，选择跟谁的视角，限次追问（dialogue mode 注意点），最后拼合六块——**拼得齐则昭雪，拼不齐则各有各的沉沦**。

## 2. 真相（写入文件头注释）

柳员外发现账房田先生亏空三千两 → 当夜书房争吵 → 田先生推柳员外下楼 → 抛算盘入河灭迹 → 从角门逃走（袖口抓破带血）→ 谎称当夜在城外收账。六块拼合即昭雪。

## 3. 结构：key nodes（六时辰众见）+ 6 POV 所见/追问 + 时序锁

```
start ─→ 子时(众见) ─→ 更夫所见 ─→ 更夫追问(dialogue) ─→ 丑时(众见) ─→ …
         （可跳过任何视角，线索缺失即代价；时序锁：后时辰的追问话题需前时辰所见已记）
六时辰走完 ─→ 拼合(读 midEvidence 分流) ─→ 6 结局
```

- **每 POV 双层**：所见场景（normal，进即记基础线索 `midnightClues.*`）+ 追问场景（dialogue，notes 2 限两问——问不满全部话题）。
- **时序锁**：如丑时酒保的追问话题「钟楼那边」需 `midnightClues.zi` 已记（更夫听见的争吵）才开放；账房说谎话题「昨夜行踪」需 `midnightClues.chen`（衙役验尸）已记才露破绽。

## 4. 场景清单（28）

| 组 | ID | 作用 | 状态 |
|---|---|---|---|
| 序 | `midnight.start` | 花灯夜入城 | — |
| 子时 | `midnight.zi` | 众见节点（钟楼/柳府方向） | — |
| | `midnight.zi.watch` | 更夫所见：柳府争吵「你敢！」 | `midnightClues.zi` +1 |
| | `midnight.zi.ask` | 更夫追问（dialogue，notes 2） | 话题 quarrel（key，`midEvidence` +1）/ bell |
| 丑时 | `midnight.chou` | 众见节点（酒肆未歇） | — |
| | `midnight.chou.tavern` | 酒保所见：柳员外轿子折返 | `midnightClues.chou` +1 |
| | `midnight.chou.ask` | 酒保追问（dialogue，notes 2） | 话题 sedan（key）/ porter（时序锁：需 zi） |
| 寅时 | `midnight.yin` | 众见节点（河上雾） | — |
| | `midnight.yin.boat` | 船娘所见：有人向河扔物 | `midnightClues.yin` +1 |
| | `midnight.yin.ask` | 船娘追问（dialogue，notes 2） | 话题 thrown（key）/ drift |
| 卯时 | `midnight.mao` | 众见节点（天将亮） | — |
| | `midnight.mao.drug` | 药郎所见：田先生角门慌出、袖口血 | `midnightClues.mao` +1 |
| | `midnight.mao.ask` | 药郎追问（dialogue，notes 2） | 话题 blood（key）/ whereto |
| 辰时 | `midnight.chen` | 众见节点（衙门口） | — |
| | `midnight.chen.office` | 衙役所见：后脑着地、非失足 | `midnightClues.chen` +1 |
| | `midnight.chen.ask` | 衙役追问（dialogue，notes 2） | 话题 skull（key）/ reporter |
| 巳时 | `midnight.si` | 众见节点（柳府账房） | — |
| | `midnight.si.ledger` | 账房田先生（真凶）所见：账本被翻 | `midnightClues.si` +1 |
| | `midnight.si.ask` | 账房追问（dialogue，notes 2） | 话题 book（key，露馅）/ alibi（说谎，时序锁：需 chen） |
| 勘验 | `midnight.river` | 寅时后河上捞起算盘（众见） | `midnightClues.river` +1 |
| | `midnight.gate` | 卯时后柳府角门（众见） | `midnightClues.gate` +1 |
| 拼合 | `midnight.merge` | 读 `midEvidence` 分流 | — |
| 结局 | `midnight.end-truth` / `end-wrong` / `end-scape` / `end-flee` / `end-fog` / `end-half` | ×6 | @restart |

## 5. 结局矩阵

| 结局 | 触发 | 情感落点 |
|---|---|---|
| `end-truth` | `midEvidence >= 4` 指认田先生 | 六块拼齐，昭雪 |
| `end-wrong` | 2 ≤ midEvidence < 4 指错（轿夫） | 拼错的代价 |
| `end-scape` | 2 ≤ midEvidence < 4 让更夫顶罪 | 顶缸的沉沦 |
| `end-flee` | 追问过 si 露馅（book）但 midEvidence < 4 | 识破却无证，真凶烧账出逃 |
| `end-fog` | midEvidence < 2 | 悬案 |
| `end-half` | 只跟了一个视角就走到终 | 各怀一块散去 |

## 6. 状态清单（进 NARRATIVE-LEDGER §1）

- `midEvidence`：0（数值，6 个关键追问各 +1，最多 6）
- `midnightClues: {}`（中间层：zi/chou/yin/mao/chen/si/river/gate）
- `flags.midnight: {}`（中间层：时序锁标记，如 flags.midnight.ziSeen）

## 7. 验收

1. lint 0 错 0 警；6 结局全可达
2. e2e 至少 2 条全路径（真结局 + 一个半途结局），含 dialogue ask 交互与时序锁断言
3. coverage 双缺 0（traverse 到不了的深链结局补 e2e）
4. 时序锁无死锁（后时辰话题不依赖未开放的前时辰入口）

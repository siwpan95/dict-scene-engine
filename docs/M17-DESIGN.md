# M17 设计稿：A1《渡口纪年》—— 跨世界观群像网状长线

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **设计稿（落地版），内容包在下一步产出** |
| 前序 | PHASE5-CONTENT-PLAN.md §6.1-A1；dialogue mode（含话题 if 时序锁）已就绪 |
| 对标 | 428 严格因果 + 底特律多 POV 交织；块茎网络（既有世界互引，调研 §4-⑦） |
| 规模 | ~42 场景 / ~9.5k 字 / 7 结局（主线档 40+ 场景） |

---

## 1. 立意

一座渡口，四时轮转：春渡、夏汛、秋枯、冬冰。一甲子间，四个过客在此各执一桩未了之事——他们分别来自四个既有世界：**古堡**（寻剑未果的旅人）、**商道**（商队散伙的行商）、**江畔**（画工陈砚秋的师弟）、**民国**（赴京赶考的书生）。玩家沿四时切换视角，听四段往事，最后在渡口汇流——**渡口不问来路，只渡该渡之人**。

这是第一条把既有内容包连成"世界网"的长线（块茎化：古堡商人/商队铜符/江畔画工/民国报纸做跨包彩蛋）。

## 2. 结构：key nodes（渡口四时）+ 4 POV + 汇流

```
start(抵渡口) ─→ 春渡(众见) ─→ 寻剑客 POV ─→ 夏汛(众见) ─→ 行商 POV
              ─→ 秋枯(众见) ─→ 画工之徒 POV ─→ 冬冰(众见) ─→ 书生 POV
四时走完 ─→ 渡口枢纽(可重访，四段往事都可回头听) ─→ 汇流 ─→ 7 结局
```

- 每个 POV = 所见场景（normal）+ 对话场景（dialogue，notes 3）+ 往事场景（该世界的闪回，彩蛋位）。
- 四时节点互有文字呼应（夏汛水涨了春渡的码头、秋枯的水位落下、冬冰封了江）。

## 3. 场景清单（~42）

| 组 | ID | 作用 | 彩蛋位 |
|---|---|---|---|
| 序 | `ferry.start` | 抵渡口，雾起 | — |
| 春渡 | `ferry.spring` | 众见节点 | — |
| | `ferry.spring.guest` | 寻剑客所见（古堡回程，剑未寻到） | 提古堡石像鬼 |
| | `ferry.spring.ask` | 寻剑客对话（dialogue，notes 3） | — |
| | `ferry.spring.past` | 往事：古堡之行 | demo 世界回闪 |
| 夏汛 | `ferry.summer` | 众见节点（江水上涨） | — |
| | `ferry.summer.trader` | 行商所见（商队散伙后贩货） | 提商队铜符 |
| | `ferry.summer.ask` | 行商对话（dialogue，notes 3） | — |
| | `ferry.summer.past` | 往事：商道之行 | caravan 世界回闪 |
| 秋枯 | `ferry.autumn` | 众见节点（水位下落） | — |
| | `ferry.autumn.painter` | 画工之徒所见（背着师兄的画箱） | 提江畔县志 |
| | `ferry.autumn.ask` | 画工之徒对话（dialogue，notes 3） | — |
| | `ferry.autumn.past` | 往事：江畔画室 | river 世界回闪 |
| 冬冰 | `ferry.winter` | 众见节点（江面封冻） | — |
| | `ferry.winter.scholar` | 书生所见（赴京赶考过江） | 提民国的报纸 |
| | `ferry.winter.ask` | 书生对话（dialogue，notes 3） | — |
| | `ferry.winter.past` | 往事：民国渡轮 | hushi 时代回闪 |
| 枢纽 | `ferry.hub` | 渡口枢纽（四段往事可回头听） | — |
| 汇流 | `ferry.merge` | 四段往事拼合 | — |
| | `ferry.merge.deep` | 深层汇流（问满关键话题才开） | — |
| 结局 | `ferry.end-sword` / `end-trail` / `end-river` / `end-letter` / `end-truth` / `end-fog` / `end-cross` | ×7 | @restart |

> 加过渡/勘验场景（渡口老渡工、渡亭、栈桥、四时碑）约 6 个，合计 ~42 场景。

## 4. 结局矩阵（7）

| 结局 | 触发 | 情感落点 |
|---|---|---|
| `end-sword` | 只跟寻剑客且问满 | 剑未寻到，人先渡了 |
| `end-trail` | 只跟行商且问满 | 商路散了，货还压着 |
| `end-river` | 只跟画工之徒且问满 | 画箱渡江，笔下有数 |
| `end-letter` | 只跟书生且问满 | 家书与功名，两难渡 |
| `end-truth` | 四段往事全听（关键话题问满） | 渡口真相：四人都渡过了自己那一岸 |
| `end-fog` | 什么都没听全 | 雾锁渡口 |
| `end-cross` | 深层汇流（四段关键线索+渡工线索） | 渡口纪年：摆渡人自己的一页 |

## 5. 状态清单（进 NARRATIVE-LEDGER §1）

- `ferryEvidence`：0（四段关键话题各 +1，最多 4；深层结局另需 `ferryClues.boatman`）
- `ferryClues: {}`（中间层：spring/summer/autumn/winter/boatman 等）
- `flags.ferry: {}`（中间层：POV 已访标记、深层话题时序锁）

## 6. 验收

1. lint 0 错 0 警；7 结局全可达
2. e2e 至少 2 条全路径（真结局 + 一个 POV 结局）+ 时序锁/彩蛋断言
3. coverage 双缺 0
4. 跨包彩蛋 ≥3 处（古堡/商队铜符/江畔/民国报纸），双向文字呼应

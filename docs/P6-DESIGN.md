# P6 设计稿：Phase 6 剩余空间收尾（星港第三季 / 古堡第三层 / 跑团夜 / 成就扩展）

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **设计稿（落地版），三内容包 + 成就扩展随本稿同步产出** |

---

## 1. P6-1 星港第三季《归港》（16 场景 / 3 结局）

三案之后的总清算：第二案大副的接头人「独眼」（第一案走私网残余）绑走第二案证人医生，欲毁卷宗。玩家救人与揭底。hub-and-spoke + 三铁证 + 指认纠错（成熟范式复用）。

| 组 | 场景 |
|---|---|
| 序/hub | `harbor3.start` / `harbor3.hub`（案卷桌） |
| spoke | dock（码头拖痕）/ yard（船坞）/ market（黑市交易账）/ office（港务司卷宗调包）/ beacon（灯塔目击）/ cell（牢房大副口供）/ clinic（医生住所暗号） |
| 铁证 | slip（卷宗调包痕）/ ledger（独眼交易账）/ code（医生留的暗号），各 +1 `harbor3Evidence` |
| 终审 | `harbor3.accuse`（指认可错） |
| 结局 | `end-truth`（归案）/ `end-wrong`（冤）/ `end-open`（悬案） |

## 2. P6-2 古堡第三层《燃薪层》（11 场景 / 3 结局）

地下层再下，第三层：建堡者烧炼剑胚的燃薪层，石像鬼源头（呼应 castle-pre）。线性机关链。

`layer3.start`（发现石阶）→ ash（灰烬层）→ forge（旧锻炉）→ chains（铁链室）→ altar（祭台）→ core（燃薪核心）→ wake（唤醒/封印选择）→ 3 结局（`end-seal` 再封印 / `end-ash` 焚层 / `end-free` 释放）

## 3. P6-3《跑团夜》（10 场景 / 2 结局）

元叙事：一群朋友围桌跑团。三骰定故事走向。呼应 TRPG 项目（d20 味）。

`rpg.start`（周五夜围桌）→ `rpg.hub`（桌上）→ dice1/2/3（三骰）→ `rpg.merge`（团终）→ 2 结局（`end-fire` 团魂燃了 / `end-scatter` 团散了）

## 4. P6-4 成就扩展（cordis.yml achievements）

为 Phase 5 新里程碑各补 1 个代表作成就（数据驱动 when: scene 条件）：

| id | 名 | 条件 |
|---|---|---|
| crossing-truth | 拼夜 | crossing.end-truth |
| garrison-hold | 城在人在 | garrison.end-hold |
| midnight-truth | 昭雪 | midnight.end-truth |
| ferry-cross | 摆渡人 | ferry.end-cross |
| castlepre-seal | 封印 | castle-pre.end-seal |
| echo-truth | 回声落地 | echo.end-truth |
| tea-deep | 共守 | tea.end-deep |
| gear-open | 天工开匣 | gear.end-open |
| water-share | 分水 | water.end-share |
| grad-say | 说出口 | grad.end-say |
| siege-hold | 死守 | siege.end-hold |
| changan-truth | 归案 | changan.end-truth |
| husxi-ink | 写下去 | hushi-extra.end-ink |
| loop2-good | 雾散还人 | loop2.end-good |
| promote-fall | 罢官 | promote.end-fall |
| whisper-escape | 逃出 | whisper.end-escape |
| cubicle-quit | 辞职 | cubicle.end-quit |

## 5. 验收

1. 三线独立可通关；lint 0 错 0 警；结局全可达；coverage 双缺 0；e2e 全量全绿
2. 成就 15→32；README 同步最终规模；commit + 推 Gitee

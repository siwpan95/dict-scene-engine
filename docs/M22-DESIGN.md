# M22 设计稿：短篇题材差收尾（S2 升官图 / S3 深巷·低语 / S5 格子间）

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **设计稿（落地版），三内容包随本稿同步产出；随后全量收尾 + 统一推 Gitee** |
| 前序 | PHASE5-CONTENT-PLAN.md §6.5-S2/S3/S5 |

---

## 1. S2《升官图》（官场讽刺短篇，12 场景 / 3 结局）

### 立意

候补小吏得一张"升官图"棋盘，每一步都是一次仕途选择。双计数 `promoteRight`（正）/`promoteBend`（曲）。

### 场景

`promote.start`（得图）→ `promote.hub`（衙门）→ 收礼/拒礼/读书/钻营/断案/大考 → `promote.merge` → 3 结局（`end-rise` 升官·曲 / `end-fall` 罢官·正 / `end-idle` 闲居·中间）

### 结局

| 结局 | 触发 | 落点 |
|---|---|---|
| `end-rise` | promoteBend >= 2 | 升了官，丢了人 |
| `end-fall` | promoteRight >= 2 | 保了心，丢了官 |
| `end-idle` | 中间态 | 闲居一生 |

## 2. S3《深巷·低语》（恐怖短篇，理智值，11 场景 / 3 结局）

### 立意

夜入深巷，墙/井/门各有低语。`sanity`（5 起）每听一次 -1；破庙可回 1（一次）。

### 场景

`whisper.start` → `whisper.hub`（巷口）→ 墙/井/门（各 sanity-1）+ 破庙（sanity+1，限一次）→ 3 结局（`end-escape` 逃出 sanity>=3 / `end-dawn` 撑到天亮 / `end-lost` 沉沦 sanity<=0）

### 结局

| 结局 | 触发 | 落点 |
|---|---|---|
| `end-escape` | sanity >= 3 且选逃 | 逃出深巷 |
| `end-dawn` | 撑过三处低语后天亮 | 天亮 |
| `end-lost` | sanity <= 0 | 沉沦 |

## 3. S5《格子间》（都市职场短篇，10 场景 / 2 结局）

### 立意

格子间的一周五天。`flags.cubicle.*`（加班/推诿/勇气）。

### 场景

`cubicle.start`（周一）→ `cubicle.hub`（一天）→ 晨会/午休/加班/项目会 → `cubicle.merge`（周五）→ 2 结局（`end-quit` 辞职·勇气 / `end-stay` 留下·接受）

## 4. 状态（进 NARRATIVE-LEDGER §1）

- S2：`promoteRight` / `promoteBend`（0 起）
- S3：`sanity`（5 起）
- S5：`flags.cubicle: {}`

## 5. M22 收尾验收（全量）

1. 三线独立可通关；lint 0 错 0 警；结局全可达
2. e2e 各 1 条全路径；coverage 双缺 0；e2e 全量全绿
3. README 规模表/目录/结构最终同步；NARRATIVE-LEDGER 全量一致
4. commit M22 后**统一推 Gitee**（M15–M22 全部 commit）

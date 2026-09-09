# M21 设计稿：复用既有模式的 DLC 双生（D3 藏晖室·余墨 / D4 子夜集·第二夜）

| 项 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | **设计稿（落地版），两内容包随本稿同步产出** |
| 前序 | PHASE5-CONTENT-PLAN.md §6.2-D3/D4；铁律④（DLC 平行加法、不改本体结局意义） |

---

## 1. D3 藏晖室·余墨（复用 diary mode，14 场景 / 3 结局）

### 1.1 立意

本体《藏晖室札记》五幕已完整（1911→1960，7 结局）。D3 取 1920s/1930s 切片（**原创演绎区，遵循 M14 OCR 引用政策**）：办《努力》的争论、整理国故的取舍、白话诗的坚持、上海闲居的牌局。复用 diary mode 做"余墨回望"。

### 1.2 场景（14）

`hushi-extra.start`（1922 春）→ `hushi-extra.hub`（藏晖室 hub）→ 切片×4（nuli/gushi/yuefu/shanghai）→ `hushi-extra.diary`（mode:'diary' 回望）→ `hushi-extra.merge` → 3 结局（`end-ink` 写下去 / `end-fire` 烧掉 / `end-home` 回乡）

### 1.3 结局

| 结局 | 触发 | 落点 |
|---|---|---|
| `end-ink` | 写下去 | 余墨成新章 |
| `end-fire` | 烧掉 | 沉默 |
| `end-home` | 回乡 | 出走 |

## 2. D4 子夜集·第二夜（复用 @loop，15 场景 / 3 结局）

### 2.1 立意

本体《子夜集》已完整（17 场景/3 结局）。D4 是雾镇的**第二夜**：货郎被困，三核（药铺/庙/渡口）拼新真相。复用 `@loop:` 时间循环，保留域 `clues.loop2`/`flags.loop2`（cordis.yml loopKeep 追加两行）。

### 2.2 场景（15）

`loop2.start`（雾起）→ `loop2.hub`（镇口，每夜行动力 loop2Moves）→ 三核（shop/temple/dock + 各勘验）→ `loop2.confront`（三核齐）→ 3 结局（`end-good` 雾散还人 / `end-deep` 守夜人 / `end-lost` 困）

### 2.3 结局

| 结局 | 触发 | 落点 |
|---|---|---|
| `loop2.end-good` | 三核拼齐，还了人 | 雾散 |
| `loop2.end-deep` | 拼齐却留下 | 守夜 |
| `loop2.end-lost` | 永远拼不齐 | 困在雾里 |

## 3. 状态（进 NARRATIVE-LEDGER §1）

- D3：`flags.hushiX: {}`（切片节拍，须被 merge 读）
- D4：`clues.loop2: {}`（三核）、`flags.loop2: {}`、`loop2Moves: 3`（每夜行动力）

## 4. 验收

1. 两 DLC 独立可通关；lint 0 错 0 警；结局全可达；本体结局意义不变
2. e2e 各 1 条全路径（D4 含 @loop 回归断言）；coverage 双缺 0
3. D3 全程原创演绎区（1920s/1930s），无 1938 后原文引用

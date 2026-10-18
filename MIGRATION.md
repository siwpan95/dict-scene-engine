# cordis-py 迁移状态（分支 cordis-py-migration）

> 本文档记录 dict-scene-engine 从 Node/Cordis 架构迁移到 Python（cordis-py）的进度。
> **master 分支不动**；本分支是迁移工作区。

## 已完成（2026-10-18）

| 步骤 | 产物 | 验证 |
|---|---|---|
| 内容包导出 | `scripts/migrate/export-packs.mjs` → `packs-export.json`（39 包 / 578KB） | node 自身 import，数据保真 |
| JSON → YAML | `scripts/migrate/json2yaml.py` → `content-py/*.yml`（39 包 / 556KB） | 场景数逐一核对，0 偏差 |
| 表达式转译 | if/when 的 JS → Python 子集（`===`→`==`、`&&`→`and`、`!x`→`not x`、`true/false/null`→`True/False/None`） | 全量 grep 无 JS 残留 |
| 清单移植 | `scripts/migrate/port-manifest.py` → `dse.yml`（7 插件条目） | packs 路径改写 content/ → content-py/ |
| **引擎校验** | `dse check` | ✅ **587 场景 / 135 结局，全部可达，exit 0** |

## 当前边界（诚实清单）

- **能跑的**：normal + battle 模式内容（combat 已移植）、save/achievements 系统层。
- **暂不能跑的**：trade / diary / dialogue（P3）、sound / hot-reload（P4）——
  这些插件已从 dse.yml 摘掉，用到这些模式的场景会**响亮报错**（不是静默错乱），
  `dse doctor` 可静态列出缺口。
- **依赖指向分支**：`pyproject.toml` 里 `dse-core` 暂指向 cordis-py 的
  `p1-core-engine` 分支（P2 功能尚未发版）；**0.2.0 发布后改为 `dse-core>=0.2.0`**。
- Node 侧文件（content/*.js、plugins/、lib/、cordis.yml、tests/*.mjs、scripts/*.mjs）
  本分支保留未删——确认迁移无误后再分提交清理，git 历史里随时可回捞。

## 复现迁移

```bash
node scripts/migrate/export-packs.mjs        # 1. ESM → JSON
python scripts/migrate/json2yaml.py          # 2. JSON → YAML（含表达式转译）
python scripts/migrate/port-manifest.py      # 3. cordis.yml → dse.yml
dse check                                    # 4. 引擎校验
```

（python 用装有 PyYAML 的环境；dse 来自 pip install -e . 后的引擎包）

## 下一步

1. `pip install -e .` 后试玩 battle/normal 线（脚本模式冒烟）
2. P3 移植 trade/diary/dialogue → 发布 dse-core 0.2.0 → pyproject 改版本约束
3. 全量试玩确认后，清理 Node 侧文件、README 改写为 Python 版

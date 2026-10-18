# cordis-py 迁移记录（分支 python）

> 本文档记录 dict-scene-engine 从 Node/Cordis 架构迁移到 Python（cordis-py）的全过程。
>
> **这不是新旧更替，是两种并行的实现方法**：master 保留 Node/Cordis 实现；
> 本分支是 Python（cordis-py）实现。两套实现各自独立成立、长期共存，**不合并**。

## 终态（2026-10-18，迁移完成）

**架构**：本仓库是 **Python 内容工程**——`dse.yml` + `content/*.yml`；
引擎 `dse-core`（cordis-py 的 PyPI 发行名）从 PyPI 安装，见 `requirements.txt`。
游戏本身不打包、不发布，`pip install` 的对象只有引擎。

```bash
pip install -r requirements.txt   # 装引擎 dse-core>=0.3.0
dse play --root .                 # 开玩
```

**验收记录**（全部真实用户路径：全新 venv + PyPI 装引擎）：

| 项 | 结果 |
|---|---|
| `dse check` | ✅ 587 场景 / 135 结局，全部可达，exit 0 |
| `dse doctor` | ✅ 五模式（battle/trade/diary/dialogue/normal）× 插件全就位 |
| 主线试玩（demo.start） | ✅ 场景渲染 + 状态插值 + 正常收尾 |
| 经营线（town.shop） | ✅ 进货/出货/过 5 天/收市结算全周期 |
| 对话线（crossing.boatman） | ✅ 话题面板 + ask/end |
| 日记线（hushi.diary） | ✅ 模式接管 + 可重读篇目 UI + back 返回 |
| `pytest tests-py/` | ✅ 4 项冒烟全绿 |

## 迁移过程（工具链可复跑，留存于 scripts/migrate/）

1. `export-packs.mjs`：node 自身 import 全部 ESM 内容包 → JSON（39 包，数据保真）
2. `json2yaml.py`：JSON → YAML，if/when 表达式 JS→Python 子集转译
   （`===`→`==`、`&&`→`and`、`!x`→`not x`、`true/false/null`→`True/False/None`）
3. `port-manifest.py`：cordis.yml → dse.yml（12 插件全挂载；logger/timer 丢弃）

## 清理决策（2026-10-18）

- **已删**（Node 实现，共 60 文件）：content/*.js（39）、plugins/、lib/、vendor/、
  tests/*.mjs、scripts/*.mjs 与 scripts/ai/、cli.js、game.js、cordis.yml、
  package.json、package-lock.json
- **保留**：`docs/`（15 篇内容设计文档——M14~M22 设计、叙事账本、扩展计划，
  是游戏设计资产不是 Node 代码，删除即不可逆损失）；`scripts/migrate/`（迁移工具链）；
  `.gitattributes`（LF 规则对 Python 侧依然有效）
- Node 版完整历史仍在 git 记录与 Gitee master，随时可回捞

## 已知边界

- 引擎侧：dse-core 0.3.0 = Node 版 47 个源文件对应能力的全量移植，无剩余缺口
- 内容侧：转换后场景数逐一核对无偏差；`if/when` 表达式已转 Python 语法，
  但**业务语义未经人工逐条校对**（结构性校验全过，玩法平衡以试玩为准）
- 音效：sound 插件已挂载，默认静音策略与 Node 版一致（DSE_MUTE/config.mute）

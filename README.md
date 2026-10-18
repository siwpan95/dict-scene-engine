# dict-scene-engine · 字典场景引擎（Python 版）

> 场景即字典，能力即插件。本仓库是**游戏内容工程**（dse.yml + content/），
> 引擎全部来自 PyPI 上的 [dse-core](https://pypi.org/project/dse-core/)
> （cordis-py 项目的发行名）。Node/Cordis 旧版的迁移记录见 [MIGRATION.md](MIGRATION.md)。

## 30 秒上手

```bash
pip install -r requirements.txt   # 装引擎（dse-core>=0.3.0）
dse play --root .                 # 开玩（或 cd 进本目录直接 dse play）
dse play --root . --input "1,1,quit"   # 脚本模式：无交互跑线（CI 友好）
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `dse play --root .` | 开始游戏 |
| `dse scenes --root .` | 列出全部 587 个场景 |
| `dse packs --root .` | 列出内容包（manifest / 依赖声明） |
| `dse check --root .` | 校验内容（Schema / 悬空跳转），有问题退出码 1 |
| `dse doctor --root .` | 体检 + 内容模式 × 已装插件交叉核对 |
| `dse saves --root .` | 列出存档位 |

## 内容包格式（YAML）

内容包是**数据文件**（不是可执行代码），一个文件一个包：

```yaml
pack:                              # 元数据（可选）
  id: my-pack
  name: 我的包
  entry: start
scenes:
  start:
    title: 村口
    text: '你有 {gold} 金币。'      # {path} 状态插值
    choices:
      - text: 进山
        do: { 'flags.mountain': true }   # 效果：数值=加减，非数值=赋值，点路径=深层写入
        goto: forest
  forest:
    mode: battle                   # 非 normal 模式由能力插件接管
    battle: { enemy: wolf, onWin: forest-win, onLose: forest-lose }
```

条件表达式为 Python 子集（`if: 'hp >= 10 and gold > 0'`），AST 白名单求值。

## 工程结构

```
dict-scene-engine/
├── dse.yml              # 插件清单（12 插件全挂载）+ 玩家初始状态 + 数值表
├── content/             # 39 个 YAML 内容包（587 场景 / 135 结局）
├── requirements.txt     # 引擎依赖 dse-core>=0.3.0
├── scripts/migrate/     # Node→Python 迁移工具链（历史留存，可复跑）
├── tests-py/            # 冒烟测试（check/doctor/试玩）
└── MIGRATION.md         # 迁移状态与边界记录
```

## 改内容即玩

编辑 `content/*.yml` 保存后，`dse.yml` 里挂着 `hot-reload` 插件时游戏内即时生效
（玩家状态保留，只有场景字典被替换）。

## 开发

```bash
pip install pytest
pytest tests-py/ -q      # 冒烟：校验 + 试玩
```

## License

MIT · Copyright (c) 2026 全哥 (siwpan)

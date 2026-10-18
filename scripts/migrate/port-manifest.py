"""cordis.yml → dse.yml（迁移第三步）：插件清单改写成 Python 引擎内置 id。

- logger / timer：Cordis 基础设施，Python 运行时不需要，直接丢弃
- trade / diary / dialogue / sound / hot-reload：P3/P4 待移植，本阶段摘掉并记录
- scenes.packs 路径：./content/*.js → ./content-py/*.yml
- achievements.list 的 when 表达式：JS → Python 子集（复用 json2yaml.translate_expr）
- 其余 config（state.initial / combat 数值表 / save.dir / engine.entry）原样保留

用法：python scripts/migrate/port-manifest.py
"""

import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(HERE))
from json2yaml import convert, translate_expr  # noqa: E402

# Node 插件 id → Python 内置 id
PLUGIN_MAP = {
    "scenes": "scenes",
    "state": "state",
    "io": "io",
    "engine": "engine",
    "combat": "combat",
    "save": "save",
    "achievements": "achievements",
}
# P3/P4 待移植（摘掉并记录到 MIGRATION.md）
DEFERRED = {
    "trade": "P3 能力层",
    "diary": "P3 能力层",
    "dialogue": "P3 能力层",
    "sound": "P4 表现层",
    "hot-reload": "P4 开发层",
}
# Cordis 基础设施，直接丢弃
DROP = {"logger", "timer"}


def port_packs(config: dict) -> dict:
    """scenes.config.packs：./content/x.js → ./content/x.yml（相对工程根）。"""
    packs = config.get("packs")
    if not isinstance(packs, list):
        return config
    new_packs = []
    for p in packs:
        s = str(p)
        if s.startswith("./content/") and s.endswith(".js"):
            new_packs.append(s.replace(".js", ".yml"))
        else:
            new_packs.append(s)
    return {**config, "packs": new_packs}


def main() -> int:
    source = REPO / "cordis.yml"
    manifest = yaml.safe_load(source.read_text(encoding="utf-8"))
    if not isinstance(manifest, list):
        print("cordis.yml 不是插件条目列表", file=sys.stderr)
        return 1

    entries = []
    deferred_used = []
    for item in manifest:
        if not isinstance(item, dict):
            continue
        plugin_id = item.get("id")
        if plugin_id in DROP:
            continue
        if plugin_id in DEFERRED:
            deferred_used.append(plugin_id)
            continue
        mapped = PLUGIN_MAP.get(plugin_id)
        if mapped is None:
            print(f"未知插件 {plugin_id}，跳过（请人工确认）", file=sys.stderr)
            continue
        config = item.get("config") or {}
        if mapped == "scenes":
            config = port_packs(config)
        else:
            config = convert(config)  # achievements.when 等表达式转译
        entry = {"id": mapped}
        if config:
            entry["config"] = config
        entries.append(entry)

    header = """# 字典场景引擎（Python 版 / cordis-py）· 插件清单
#
# 本文件由 scripts/migrate/port-manifest.py 从 cordis.yml 移植生成。
# 依赖注入由运行时按 inject 声明拓扑编排，全部就绪后才会 setup。
#
# 插件分层：
#   内核层  scenes / state / io / engine     引擎不可拔的四个基础服务
#   能力层  combat                           接管 scene.mode 的可选玩法
#   系统层  save / achievements              存档与成就
#   待移植  trade / diary / dialogue（P3）/ sound / hot-reload（P4）
#          —— 摘掉期间，用到这些模式的内容场景会响亮报错（dse doctor 可静态核对）

"""
    target = REPO / "dse.yml"
    with open(target, "w", encoding="utf-8") as f:
        f.write(header)
        yaml.safe_dump(entries, f, allow_unicode=True, sort_keys=False, width=120)

    print(f"生成 {target}（{len(entries)} 个插件条目）")
    print(f" deferred（待移植，已摘掉）: {', '.join(deferred_used) or '（无）'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

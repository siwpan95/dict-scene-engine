"""内容包转换：packs-export.json → Python 引擎的 YAML 内容包（迁移第二步）。

- if / when 字段的 JS 表达式 → Python 子集：
    === → ==    !== → !=    && → and    || → or    !x → not x
    true/false/null → True/False/None（字符串字面量内的内容不动）
- 输出 content-py/<name>.yml：pack 元数据 + scenes 同文件（引擎约定）
- 场景数逐一核对，不一致会打 ⚠️

用法：python scripts/migrate/json2yaml.py
依赖：PyYAML（用 cordis-py 的 venv 跑）
"""

import json
import re
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent

EXPR_FIELDS = {"if", "when"}
_LITERALS = {"true": "True", "false": "False", "null": "None"}


def translate_expr(expr: str) -> str:
    """JS 表达式 → Python 子集（逐字符扫描，跳过字符串字面量）。"""
    out = []
    i, n = 0, len(expr)
    quote = None
    while i < n:
        ch = expr[i]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(expr[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'":
            quote = ch
            out.append(ch)
            i += 1
            continue
        if expr[i:i + 3] == "===":
            out.append("==")
            i += 3
            continue
        if expr[i:i + 3] == "!==":
            out.append("!=")
            i += 3
            continue
        if expr[i:i + 2] == "&&":
            out.append(" and ")
            i += 2
            continue
        if expr[i:i + 2] == "||":
            out.append(" or ")
            i += 2
            continue
        if expr[i:i + 2] == "?.":
            print(f"警告: 可选链 ?. 已按 . 转换（语义有差异，请人工检查）: {expr}", file=sys.stderr)
            out.append(".")
            i += 2
            continue
        if ch == "!" and expr[i + 1:i + 2] != "=":
            out.append("not ")
            i += 1
            continue
        m = re.match(r"(true|false|null)\b", expr[i:])
        if m:
            out.append(_LITERALS[m.group(1)])
            i += len(m.group(1))
            continue
        out.append(ch)
        i += 1
    if quote:
        raise ValueError(f"表达式引号不配对: {expr!r}")
    return "".join(out)


def convert(node):
    """递归转换：EXPR_FIELDS 里的字符串走表达式翻译，其余原样。"""
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            if key in EXPR_FIELDS and isinstance(value, str):
                out[key] = translate_expr(value)
            else:
                out[key] = convert(value)
        return out
    if isinstance(node, list):
        return [convert(item) for item in node]
    return node


def main() -> int:
    export_file = HERE / "packs-export.json"
    if not export_file.is_file():
        print("缺少 packs-export.json，请先跑: node scripts/migrate/export-packs.mjs", file=sys.stderr)
        return 1
    packs = json.loads(export_file.read_text(encoding="utf-8"))

    out_dir = REPO / "content-py"
    out_dir.mkdir(exist_ok=True)
    problems = 0
    for pack in packs:
        scenes = convert(pack["scenes"])
        doc: dict = {"scenes": scenes}
        if pack["manifest"]:
            doc = {"pack": convert(pack["manifest"]), **doc}
        target = out_dir / (Path(pack["file"]).stem + ".yml")
        with open(target, "w", encoding="utf-8") as f:
            f.write(f"# 由 scripts/migrate/json2yaml.py 从 content/{pack['file']} 转换\n")
            f.write("# （条件表达式已转 Python 语法；业务内容原样，未人工校对）\n")
            yaml.safe_dump(doc, f, allow_unicode=True, sort_keys=False, width=120)
        flag = ""
        if pack["sceneCount"] != len(scenes):
            flag = "  ⚠️ 场景数不一致！"
            problems += 1
        print(f"  {pack['file']}: {pack['sceneCount']} → {len(scenes)}{flag}")
    print(f"\n转换 {len(packs)} 个内容包 → content-py/（问题 {problems} 个）")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())

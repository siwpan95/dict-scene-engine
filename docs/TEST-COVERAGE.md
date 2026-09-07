# 剧情线结局覆盖矩阵（TEST-COVERAGE）

> 生成：2026-09-07 · 43 个结局 · 覆盖 43/43 · 生成器：node tests/coverage.mjs
> 覆盖来源：**T** = tests/traverse.mjs（结构-状态遍历，执行每条边/效果/条件）
>          **E** = tests/e2e.mjs（真实进程路径断言，按标题 waitFor 实跑）
> 门：两栏皆空（T✗ E✗）时退出码 1 —— 新结局必须至少落进其中一个来源。

| 结局 | 标题 | T | E |
|---|---|---|---|
| `arena-lose` | 结局 · 试炼场之殇 | ✓ | ✓ |
| `case2.ending.miscarry` | 结局 · 连环案 · 冤判 | ✓ | ✗ |
| `case2.ending.truth` | 结局 · 连环案 · 真相 | ✗ | ✓ |
| `ending-lose` | 结局 · 荒山野岭 | ✓ | ✗ |
| `ending-win` | 结局 · 剑之认主 | ✓ | ✓ |
| `ending.caravan-broke` | 结局 · 商队散伙 | ✓ | ✓ |
| `ending.caravan-hermit` | 结局 · 绿洲隐者 | ✗ | ✓ |
| `ending.caravan-king` | 结局 · 商队之王 | ✗ | ✓ |
| `ending.merc` | 结局 · 好价钱 | ✓ | ✓ |
| `ending.miscarry` | 结局 · 冤案 | ✓ | ✓ |
| `ending.sacrifice` | 结局 · 献祭 | ✗ | ✓ |
| `ending.sword` | 结局 · 完整的剑 | ✗ | ✓ |
| `ending.truth` | 结局 · 真凶归案 | ✗ | ✓ |
| `ending.tyrant` | 结局 · 僭主 | ✓ | ✗ |
| `horror.end-dawn` | 结局 · 古宅 · 天亮 | ✓ | ✓ |
| `horror.end-eaten` | 结局 · 古宅 · 烛灭 | ✗ | ✓ |
| `horror.end-master` | 结局 · 古宅 · 宅主 | ✗ | ✓ |
| `horror.end-rain` | 结局 · 夜路 · 雨 | ✓ | ✗ |
| `loop.end-arson` | 结局 · 一了百了 | ✗ | ✓ |
| `loop.end-deep` | 结局 · 夜行人 | ✗ | ✓ |
| `loop.end-forever` | 结局 · 第七夜 | ✓ | ✗ |
| `loop.end-good` | 结局 · 雾散·还人 | ✗ | ✓ |
| `post.end-betray` | 结局 · 冷 | ✗ | ✓ |
| `post.end-go` | 结局 · 出关 | ✗ | ✓ |
| `post.end-part` | 结局 · 各安 | ✓ | ✗ |
| `post.end-stay` | 结局 · 留灯 | ✓ | ✓ |
| `river.end-open` | 结局 · 疑案 | ✓ | ✗ |
| `river.end-ousted` | 结局 · 被逐 | ✓ | ✗ |
| `river.end-truth` | 结局 · 铁证定谳 | ✗ | ✓ |
| `river.end-wrong-li` | 结局 · 冤狱 | ✓ | ✓ |
| `river.end-wrong-sun` | 结局 · 冤狱 | ✓ | ✓ |
| `scifi.end-coexist` | 结局 · 远望七号 · 交易 | ✓ | ✗ |
| `scifi.end-escape` | 结局 · 远望七号 · 弃站 | ✗ | ✓ |
| `scifi.end-fix` | 结局 · 远望七号 · 重启 | ✗ | ✓ |
| `scifi.end-lost` | 结局 · 远望七号 · 沉没 | ✓ | ✗ |
| `starport-win` | 结局 · 数据核心 | ✓ | ✓ |
| `town.end-mid` | 结局 · 东市 · 小本营生 | ✗ | ✓ |
| `town.end-poor` | 结局 · 东市 · 铺子没保住 | ✓ | ✓ |
| `town.end-rich` | 结局 · 东市 · 商会入主 | ✗ | ✓ |
| `wuxia.end-dead` | 结局 · 刀客 · 死 | ✓ | ✗ |
| `wuxia.end-letgo` | 结局 · 刀客 · 放下 | ✓ | ✗ |
| `wuxia.end-mutual` | 结局 · 刀客 · 毒 | ✗ | ✓ |
| `wuxia.end-vengeance` | 结局 · 刀客 · 了结 | ✓ | ✓ |

✔ 全部结局至少有一个覆盖来源（traverse 或 e2e）。

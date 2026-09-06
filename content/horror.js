// 恐怖短篇《古宅惊魂》（M9 / Phase 3 · 多风格内容库）
// ⚠️ ESM 模块，加载即执行 —— 只装载可信来源（见 README 安全须知）
//
// 风格：中式恐怖。结构：资源管理（蜡烛数量 = 行动次数）+ 三线调查（大厅为枢纽）。
// 驱动：items.candle（蜡烛，探索耗 1）、flags.*（各房间线索）、horrorEvidence 计数。
// 三结局：天亮逃生 / 成为宅主 / 被吞噬。

export default {
  'horror.start': {
    title: '夜路 · 古宅',
    text: '雨是从天黑开始下的。你错过了最后一个渡口，在野地里越走越偏，等看见那扇黑漆大门时，雨已经大到睁不开眼。\n'
      + '门上的铜环冰凉，你只轻轻一推，门就开了——像等了你很久。\n'
      + '堂屋里没有灯，却亮着一支白蜡烛，火苗直直的，一点不晃。你的影子在墙上被拉得又细又长，像另一个人。',
    choices: [
      { text: '拿起蜡烛，进屋看看（得蜡烛 ×3）', do: { 'items.candle': +3 }, goto: 'horror.hall' },
      { text: '转身离开，宁可淋雨', goto: 'horror.end-rain' },
    ],
  },

  'horror.hall': {
    title: '古宅 · 大堂',
    text: '大堂里供着一块无字牌位，香炉里的香早就冷透了。烛光扫过去，你看见墙上挂着一幅画像——画上的人没有画眼睛。\n'
      + '「哒。」楼上传下来一声响，像有人把什么东西放到了地板上。\n'
      + '你手里的蜡烛还剩 {items.candle} 支。这宅子大得没有边，可你总觉得，越往里走，越像有个人在引着你。',
    choices: [
      { text: '上楼看看（耗 1 支蜡烛）', if: 'items.candle >= 1', do: { 'items.candle': -1 }, goto: 'horror.attic' },
      { text: '去西边的厨房找找有没有后门（耗 1 支蜡烛）', if: 'items.candle >= 1', do: { 'items.candle': -1 }, goto: 'horror.kitchen' },
      { text: '推开东厢房的门（耗 1 支蜡烛）', if: 'items.candle >= 1', do: { 'items.candle': -1 }, goto: 'horror.bedroom' },
      { text: '躲在大堂熬到天亮（耗 1 支蜡烛）', if: 'items.candle >= 1', do: { 'items.candle': -1 }, goto: 'horror.wait' },
    ],
  },

  'horror.kitchen': {
    title: '古宅 · 厨房',
    text: '厨房里结满了蛛网，灶台却是温的。你揭开锅盖，里面是一锅还冒热气的粥——这宅子明明没人。\n'
      + '碗橱里整整齐齐摆着几根白蜡烛，根根都像新的一样。你伸手去拿，指尖碰到碗橱背面，摸到一行刻字：「别喝那粥。」\n'
      + '后门就在灶台旁边，门外黑得像一口井。',
    choices: [
      { text: '拿上蜡烛（+2）', if: '!flags.gotCandle', do: { 'flags.gotCandle': true, 'items.candle': +2 }, goto: 'horror.kitchen' },
      { text: '推后门，看看能不能出去', goto: 'horror.backdoor' },
      { text: '回大堂', goto: 'horror.hall' },
    ],
  },

  'horror.backdoor': {
    title: '古宅 · 后门',
    text: '后门推开，外面不是雨夜，而是一条望不到头的回廊，两侧的门一扇挨着一扇，全都虚掩着。\n'
      + '每一扇门后都黑得发稠。你听见回廊尽头有个声音在哼歌，调子像小时候听过的童谣，却总差半个音。\n'
      + '「来呀。」那个声音说，「蜡烛要烧完了。」',
    choices: [
      { text: '退回厨房', goto: 'horror.kitchen' },
      { text: '沿着回廊走到底', if: 'flags.gotCandle', do: { 'flags.metGhost': true }, goto: 'horror.cellar' },
    ],
  },

  'horror.attic': {
    title: '古宅 · 阁楼',
    text: '楼梯吱呀作响。阁楼地板上放着一个小木马，马头朝着你。\n'
      + '墙角堆着几口旧箱子，你打开最近的一口，里面是些小孩的衣裳，叠得整整齐齐，领口绣着个「安」字。\n'
      + '木马突然轻轻摇了一下。没有风。你数了数箱子里的小袄——一共七件，一年一件。',
    choices: [
      { text: '翻其他箱子找线索', if: '!flags.gotClue1', do: { 'flags.gotClue1': true, horrorEvidence: +1 }, goto: 'horror.attic' },
      { text: '回大堂', goto: 'horror.hall' },
    ],
  },

  'horror.bedroom': {
    title: '古宅 · 东厢房',
    text: '东厢房是一间卧房，帐幔半垂。梳妆台上摆着一本泛黄的日记，字迹秀气：\n'
      + '「老爷说，病能好，只要七月十四那晚留在这宅子里，点足七支蜡烛。这是第三年。孩子已经分不清夜和昼了。」\n'
      + '日记最后几页被撕掉了，只剩半句：「他骗我，根本没有——」',
    choices: [
      { text: '收起日记（关键线索）', if: '!flags.gotClue2', do: { 'flags.gotClue2': true, horrorEvidence: +1 }, goto: 'horror.bedroom' },
      { text: '回大堂', goto: 'horror.hall' },
    ],
  },

  'horror.cellar': {
    title: '古宅 · 回廊尽头',
    text: '回廊尽头是一间地窖。地窖里点着六支蜡烛，围成一圈，中间坐着一个人影——不，是半个人影，下半身像融化在黑暗里。\n'
      + '「第七支，就差第七支了。」它抬起头，脸上空荡荡的，像画像里那幅没有画眼睛的脸。\n'
      + '「你来得正好。把你的蜡烛给我，这宅子就是你的了。我替你守着它，替你熬过每一个七月十四。」',
    choices: [
      { text: '把蜡烛给它，接下这宅子', if: 'items.candle >= 1', do: { 'items.candle': -1, 'flags.gaveCandle': true }, goto: 'horror.end-master' },
      { text: '明白了——这宅子靠蜡烛续命。吹灭它！', if: 'horrorEvidence >= 2', goto: 'horror.end-dawn' },
      { text: '转身就跑', goto: 'horror.end-eaten' },
    ],
  },

  'horror.wait': {
    title: '古宅 · 大堂 · 夜最深时',
    text: '你抱紧剩下那点烛光，盯着墙上的画像。时间像被冻住了。\n'
      + '不知过了多久，画像上那双没画的眼睛，忽然有了两点极淡的红——像血丝，又像有人隔着纸在看你。\n'
      + '蜡烛的火苗晃了一下，还是直的。',
    choices: [
      { text: '继续熬（耗 1 支蜡烛）', if: 'items.candle >= 1', do: { 'items.candle': -1 }, goto: 'horror.wait2' },
      { text: '蜡烛不够了，往楼上跑', if: 'items.candle < 1', goto: 'horror.end-eaten' },
    ],
  },

  'horror.wait2': {
    title: '古宅 · 大堂 · 鸡鸣',
    text: '天边终于发白。鸡叫从很远的地方传过来，一声，又一声。\n'
      + '你手里的蜡烛烧到了底，火苗「啪」地灭了。画像还是画像，堂屋还是堂屋，只是地板上多了几行湿脚印，绕着你坐的地方，一圈又一圈。\n'
      + '那脚印很轻，像有人踮着脚，在你身边走了整整一夜。\n'
      + '门外的雨停了。',
    choices: [
      { text: '推门出去，头也不回', goto: 'horror.end-dawn' },
    ],
  },

  'horror.end-dawn': {
    title: '结局 · 古宅 · 天亮',
    text: '你在晨光里走出了那扇黑漆大门。回头再看，哪有什么古宅——只有一截烧焦的断墙，几丛荒草，和一个破旧的木马。\n'
      + '你摸了摸怀里，日记本还在，字迹却淡得几乎看不见了。\n'
      + '后来你路过那带地方，总绕道走。有人问你为什么，你只说：「那地方，晚上别去。」\n'
      + '（GOOD END · 你熬过了这一夜，把真相和命一起带了出来）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'horror.end-master': {
    title: '结局 · 古宅 · 宅主',
    text: '你把蜡烛递过去的那一刻，它笑了——脸上没有五官，你却清楚地知道它在笑。\n'
      + '「好孩子。」它说。七支蜡烛一齐亮起，把地窖照得通明。\n'
      + '你的影子在火光里慢慢站了起来，走回大堂，坐到了供桌后面。而那个"你"，替你走进了雨里，再没有回头。\n'
      + '（TRUE END · 你成了宅子的新主人——至于你自己去了哪里，没人知道）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'horror.end-eaten': {
    title: '结局 · 古宅 · 烛灭',
    text: '最后一支蜡烛灭了。黑暗像水一样漫上来，淹过脚踝、膝盖、胸口。\n'
      + '你听见那个走调的童谣在耳边响起来，越来越近，最后贴在你的后颈上。\n'
      + '第二天，路过的人说，野地里多了一扇黑漆大门。\n'
      + '（BAD END · 你留在了宅子里，成了它的一部分）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'horror.end-rain': {
    title: '结局 · 夜路 · 雨',
    text: '你转身走进雨里，深一脚浅一脚，硬是摸回了渡口。船家见你脸色惨白，没敢多问。\n'
      + '「那宅子？雨夜里是不开门迎客的。」船家顿了顿，「除非——它想要你进去。」\n'
      + '（NEUTRAL END · 你躲过了这一夜。但有些门，躲不躲，它都在等你）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },
}

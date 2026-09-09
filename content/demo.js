// 示例场景字典：《古堡寻剑》主线
// ⚠️ 这是 ESM 模块，加载即执行 —— 只装载可信来源的内容包（见 README 安全须知）
//
// 结构：branch-and-bottleneck 为主干 + 村庄枢纽可重访
//   开场 start → 序章枢纽 village → 三条路线（林间 / 官道 / 情报）→ 瓶颈 castle → 多结局
//   支线：试炼场（战斗系统 DLC）、星港（另一个内容包）
// 状态变量的权威清单见 docs/NARRATIVE-LEDGER.md，由 npm run lint:content 校验一致性
//
// 覆盖引擎特性：文本插值（含 title 与 choice.text）、条件选项、状态效果、
//               battle 模式接管、多结局、'@restart' 特殊跳转

export default {
  // ══════════════ 开场 ══════════════

  start: {
    title: '村庄 · 晨雾',
    text: '{name}，你在晨雾中醒来。\n村口的公告栏钉着一张泛黄的告示：北山古堡的失落之剑，寻回者赏金百枚。昨夜又有旅人一去不回。\n你掂量了一下行囊：HP {hp}，金币 {gold}。铁匠铺的炉火刚起，酒馆的木门吱呀作响——今天从这里开始。',
    choices: [
      { text: '走进村庄，打听门路', goto: 'village' },
      { text: '直接出发，走林间小路（快，但传言有狼）', goto: 'forest' },
      { text: '直接出发，走官道大路（绕远，但安全）', goto: 'road' },
      { text: '前往试炼场（战斗系统 DLC）', goto: 'arena' },
      { text: '登船前往第七星港（DLC）', goto: 'starport-hub' },
      { text: '西出阳关，加入一支荒漠商队（新主线）', goto: 'caravan.camp' },
      { text: '去东市盘下一间铺子试试营生（经营 Mod）', goto: 'town.start' },
      { text: '听一段旧江湖的旧事（武侠短篇）', do: { 'items.blade': +1 }, goto: 'wuxia.start' },
      { text: '醒在一座空间站的警报声里（科幻短篇）', goto: 'scifi.start' },
      { text: '误入雨夜中的古宅（恐怖短篇）', goto: 'horror.start' },
      { text: '雾夜投宿，误入山脚一家叫「听雨」的客店（时间循环短篇）', goto: 'loop.start' },
      { text: '大雪封路，借宿在官道尽头一盏还亮着灯的破驿（情感短篇）', goto: 'post.start' },
      { text: '江畔捞起画工的浮尸——县志的河工账，对不上（历史推理长线）', goto: 'river.start' },
      { text: '深巷尽头，一间叫「千灯」的灯笼铺还亮着灯（AI-P0 短篇）', goto: 'lantern.start' },
      { text: '桥头雪夜里，一间热汤面摊还亮着（市井短篇）', goto: 'noodle.start' },
      { text: '村口的皮影班今夜唱《钟馗》，幕布后多了一个影子（民俗志怪）', goto: 'shadow.start' },
      { text: '夏夜城外，一个提灯的孩子说要带你去萤火巷（童趣幻想）', goto: 'firefly.start' },
      { text: '翻开一册一九一一年的旧札记，替那个人做几个决定（新主线《藏晖室札记》）', goto: 'hushi.start' },
      { text: '风雪封山，被困雪庄——翌晨主人暴毙，凶手在八客之中（暴风雪山庄本格中篇）', goto: 'snow.start' },
      { text: '雾夜江渡出了人命——船夫与更夫各执一词（同一夜多视角中篇）', goto: 'crossing.start' },
      { text: '边塞三年，一封家书——烽火与归期之间（双篇章历史中篇）', goto: 'garrison.start' },
      { text: '花灯夜进城——一夜六个时辰，六个人各见真相的一块（群像多视角长线）', goto: 'midnight.start' },
      { text: '雾起江渡——古堡、商道、江畔、民国的四个过客在此交汇（跨世界观群像长线）', goto: 'ferry.start' },
      { text: '回到建堡的年代——三子祭剑之夜（古堡前史 DLC·平行扩展）', goto: 'castle-pre.start' },
      { text: '再访星港——调度长溺毙第七码头，旧案的余波（星港第二季 DLC·平行扩展）', goto: 'echo.start' },
      { text: '城南老巷一间没招牌的茶肆——三年三遇（情感中篇）', goto: 'tea.start' },
      { text: '后山深处一座机巧阁——机关连环，天工有手记（解谜中篇）', goto: 'gear.start' },
      { text: '断水的第七天，家里还有两桶水（末日生存短篇）', goto: 'water.start' },
      { text: '毕业前夜，口袋里有张没送出去的字条（校园青春短篇）', goto: 'grad.start' },
      { text: '围城第四十七天，敌军明日总攻——半块玉佩，一半城破，一半从前（双篇章历史长线）', goto: 'siege.start' },
      { text: '长安西市，一封边关密信失踪——商贾、歌姬、金吾卫各执一词（历史都市主线）', goto: 'changan.start' },
      { text: '藏晖室案头的余墨——1920s 的稿子、旧刊与信（胡适札记 DLC·平行扩展）', goto: 'hushi-extra.start' },
      { text: '雾镇起了第二场雾——货郎的铜铃丢了（子夜集第二夜 DLC·平行扩展）', goto: 'loop2.start' },
    ],
  },

  // ══════════════ 序章 · 村庄枢纽（可重访） ══════════════

  village: {
    title: '石桥村 · 十字路口',
    text: '村子不大，一条青石板路把铁匠铺、杂货铺和酒馆串在一起。几个孩童追跑着经过，目光落在你腰间空着的剑鞘上。\n老槐树下的告示牌被人用炭笔添了一行小字：「剑在堡中，命在己手」。十字路口四面通达——去哪儿，你自己拿主意。',
    onEnter: { 'visits.village': +1 },
    choices: [
      { text: '去杂货铺（带 {gold} 枚金币）', goto: 'village.shop' },
      { text: '进酒馆，花点钱听点消息', if: 'gold >= 2', goto: 'village.tavern' },
      { text: '出村：走林间小路', goto: 'forest' },
      { text: '出村：走官道大路', goto: 'road' },
      { text: '去老猎人家打听情报（5 金币）', if: 'gold >= 5', goto: 'gossip' },
      { text: '回村口，重新打算这一天的路程', goto: 'start' },
    ],
  },

  'village.shop': {
    title: '石桥村 · 杂货铺',
    text: '铺子里堆满瓶瓶罐罐，柜台后是个独眼的老妇。她瞥了你一眼：「外乡人。火把三枚，伤药五枚——古堡里黑，没火把你连自己的手都看不见。」\n角落的木箱上摆着一杆小秤：「带东西来卖也行，废墟里刨出来的玩意儿，我照收。」',
    choices: [
      { text: '买火把（3 金币）', if: 'gold >= 3 && !items.torch', do: { gold: -3, 'items.torch': +1 }, goto: 'village.shop' },
      { text: '买伤药（5 金币，恢复 8 HP）', if: 'gold >= 5 && hp < maxHp', do: { gold: -5, hp: +8 }, goto: 'village.shop' },
      { text: '卖掉古物（12 金币）', if: 'items.relic >= 1', do: { 'items.relic': -1, gold: +12 }, goto: 'village.shop' },
      { text: '卖掉狼皮（6 金币）', if: 'items.wolf_pelt >= 1', do: { 'items.wolf_pelt': -1, gold: +6 }, goto: 'village.shop' },
      { text: '卖掉石像鬼核心（40 金币）', if: 'items.golem_core >= 1', do: { 'items.golem_core': -1, gold: +40 }, goto: 'village.shop' },
      { text: '回十字路口', goto: 'village' },
    ],
  },

  'village.tavern': {
    title: '石桥村 · 老橡木酒馆',
    text: '木门一推，烟味和麦酒味扑面而来。角落里坐着个戴兜帽的佣兵，独自盯着杯底；柜台后的老板正擦着一只永远擦不干净的杯子。\n「坐。」老板把杯子顿在台面上，「消息两枚金币一条，童叟无欺。角落那位要是喝高兴了，也许肯跟你走一趟——他最近手头紧，八枚金币就能雇下来。」',
    choices: [
      { text: '买守卫换班的情报（2 金币）', if: 'gold >= 2 && !flags.intelBought', do: { gold: -2, 'flags.intelBought': true }, goto: 'village.tavern' },
      { text: '请佣兵喝一杯，雇他同行（8 金币）', if: 'gold >= 8 && !flags.hasAlly', do: { gold: -8, 'flags.hasAlly': true }, goto: 'village.tavern' },
      { text: '亮出试炼之王的身份——老板请客（恢复 3 HP）', if: 'flags.arenaChampion', do: { hp: +3 }, goto: 'village.tavern' },
      { text: '听听酒馆里的闲话', goto: 'village.tavern.rumor' },
      { text: '回十字路口', goto: 'village' },
    ],
  },

  'village.tavern.rumor': {
    title: '酒馆 · 闲话',
    text: '「古堡？那是给死人住的地方。」一个货郎压低声音，「守卫石像会说话，说『持剑者可入』——可谁带着剑去？上个月有个疯子空着手闯进去，第二天被人发现躺在山沟里，气还有，魂没了。」\n'
      + '角落的佣兵抬起头看了你一眼，又低下头去。他手边的刀鞘上刻着七道浅痕。',
    choices: [
      { text: '向货郎打听商人的底细（2 金币）', if: 'gold >= 2 && !flags.knowWeakness', do: { gold: -2, 'flags.knowWeakness': true }, goto: 'village.tavern.rumor' },
      { text: '向佣兵请教石像的破绽（需已雇他）', if: 'flags.hasAlly', goto: 'village.tavern.ally' },
      { text: '回柜台', goto: 'village.tavern' },
    ],
  },

  'village.tavern.ally': {
    title: '酒馆 · 佣兵的忠告',
    text: '佣兵把杯中酒一口喝干，终于开口：「石像我见过一次，远远地看的。它认兵器——你手里有它认的物件，它就让你过；没有，它就动手。」\n'
      + '「还有，别正面。石像的正面是给人看的，侧面才是它的地方。可惜我从没绕到过侧面——那次我是跑着回来的。」',
    choices: [
      { text: '记下了，回柜台', goto: 'village.tavern' },
      { text: '现在就出发去古堡', goto: 'castle' },
    ],
  },

  // ══════════════ 第一章 · 三条路线 ══════════════

  forest: {
    title: '林间小路',
    text: '一进林子，光就暗了半截。松针在脚下发出细碎的声响，不知名的鸟在头顶叫了两声便噤了口。\n'
      + '走约莫半里，路面分了岔——左边隐约有夯土的痕迹，通向林子深处；右边是猎人踩出来的兽道，窄但直。风里飘来一丝腥气，很淡，但确实存在。',
    choices: [
      { text: '走左边，探一探林子深处', goto: 'forest.path' },
      { text: '走右边兽道，直穿过去', goto: 'forest.ruins' },
      { text: '退回去，改走官道', goto: 'road' },
    ],
  },

  'forest.path': {
    title: '林间 · 岔路深处',
    text: '夯土的路面断断续续，两旁的树干上留着旧刀痕——有人在这里砍过路。越往里走，腥气越重。\n'
      + '转过一棵三人合抱的老松，你看见它了：一头独眼狼，前爪按着半只啃剩的狍子，独眼里没有怯意，只有估量。它的后腿已经绷紧了。',
    choices: [
      { text: '正面迎战（当前 HP {hp}）', if: 'hp >= 10', do: { hp: -8 }, goto: 'wolf-win' },
      { text: '慢慢后退，绕开它（擦伤 2 HP）', do: { hp: -2 }, goto: 'forest.ruins' },
      { text: '扔块干粮引开它（5 金币）', if: 'gold >= 5', do: { gold: -5 }, goto: 'forest.ruins' },
    ],
  },

  'forest.ruins': {
    title: '林间 · 猎户废墟',
    text: '兽道的尽头是一片塌了半边的石屋，屋顶塌下来的木梁上架着早已熄灭的火塘。墙角倒着一支生锈的猎叉，屋里黑得像口井。\n'
      + '门框上钉着块木牌，字迹被雨水泡得模糊，只辨得出「……勿入，夜有声」几个字。地上有新翻过的土——不久前有人来过。',
    choices: [
      { text: '点火把进去搜查', if: 'items.torch >= 1', goto: 'forest.ruins.inside' },
      { text: '摸黑进去（看不见，会摔伤 4 HP）', do: { hp: -4 }, goto: 'forest.ruins.inside' },
      { text: '不贪这个便宜，穿过废墟继续赶路', goto: 'road.merchant' },
    ],
  },

  'forest.ruins.inside': {
    title: '废墟 · 屋内',
    text: '你在瓦砾里翻找，指尖触到一件冰凉的金属——是枚巴掌大的青铜牌，正面铸着一柄断裂的剑，背面刻着古堡的纹章。\n'
      + '这不是猎户该有的东西。纹章的刻法是官家的手法，边角还留着被撬过的痕迹，像是从某扇门上硬生生拆下来的。\n'
      + '有人把古堡的记号带到了这里，又匆匆丢下——他为什么不把它带回堡里去？',
    onEnter: { 'items.relic': +1 },
    choices: [
      { text: '收好青铜牌，继续赶路去官道', goto: 'road.merchant' },
      { text: '回村，去杂货铺问问这东西的来历', goto: 'village.shop' },
    ],
  },

  'wolf-win': {
    title: '林间 · 狼穴',
    text: '独眼狼终于倒了下去，血浸进松针里。它守着的不是食物，而是一柄断剑——剑身从中断裂，断口却是旧伤，像被人用巨力硬生生折断的。\n'
      + '剑柄上缠着褪色的布条，布条里裹着半张字条，只剩三个字还能辨认：「……不认主……」',
    onEnter: { 'items.broken_sword': +1 },
    choices: [
      { text: '收起断剑，继续前往官道', goto: 'road' },
      { text: '回村，先去酒馆让人看看这东西', goto: 'village.tavern' },
    ],
  },

  road: {
    title: '官道 · 青石大路',
    text: '官道平坦好走，两侧是规整的麦田，偶尔有运货的骡车经过，车夫朝你点点头。\n'
      + '这条路绕远，但走的人多，也就安全——至少白天是这样。路边每隔三里立着一块界石，石面上刻着"北山堡界"四个字，字迹被无数只手摸得发亮。\n'
      + '走了约莫一个时辰，前方路边停着一辆篷车，车帘掀着，隐隐有铁器的反光。',
    choices: [
      { text: '上前看看篷车', goto: 'road.merchant' },
      { text: '低着头快步走过去', goto: 'road.ambush' },
    ],
  },

  'road.merchant': {
    title: '官道 · 篷车商人',
    text: '篷车里堆着锅碗、皮货和几柄裹着油布的兵器。商人是个矮胖的中年人，笑起来眼睛眯成一条缝：「小伙子，看你面有煞气——往北去的？那古堡可不是好玩的地方。」\n'
      + '他掀开油布，露出一柄锈迹斑斑的长剑：「祖上传的锈剑，十枚金币，保命用的。不还价。」',
    choices: [
      { text: '十枚金币，成交（你有 {gold} 枚）', if: 'gold >= 10', do: { gold: -10, 'items.rusty_sword': +1 }, goto: 'road.merchant' },
      { text: '「五枚，不然算了」——吃准他怕还价', if: 'flags.knowWeakness && gold >= 5', do: { gold: -5, 'items.rusty_sword': +1 }, goto: 'road.merchant' },
      { text: '亮出青铜牌，问他认不认得这纹章', if: 'items.relic >= 1', goto: 'road.merchant.relic' },
      { text: '不买，继续往古堡走', goto: 'castle' },
    ],
  },

  'road.merchant.relic': {
    title: '篷车 · 纹章',
    text: '商人的笑容僵了一下，随即恢复如常。他压低声音：「这东西从林子里的废墟刨出来的？那你听我一句——别带进古堡。石像认剑，也认记号。你带着它，等于告诉堡里的东西：你知道内情。」\n'
      + '他从钱箱里数出十二枚金币推过来：「卖我，两清。」',
    choices: [
      { text: '卖给他（12 金币）', do: { 'items.relic': -1, gold: +12 }, goto: 'road.merchant' },
      { text: '不卖，收好青铜牌', goto: 'road.merchant' },
    ],
  },

  'road.ambush': {
    title: '官道 · 埋伏',
    text: '你刚走过篷车，身后传来脚步声——两个蒙面人从麦田里冲出来，手里是磨过的镰刀。「把钱留下，人可以不死。」\n'
      + '四下无人，麦浪在风里摇晃，没人会听见这里的动静。',
    choices: [
      { text: '有同伴在，并肩打（代价小）', if: 'flags.hasAlly', do: { hp: -3, gold: -2 }, goto: 'road.merchant' },
      { text: '独自拼命（没同伴，代价不小）', if: '!flags.hasAlly', do: { hp: -9 }, goto: 'road.merchant' },
      { text: '把钱袋扔过去，趁机跑（6 金币）', if: 'gold >= 6', do: { gold: -6 }, goto: 'road.merchant' },
    ],
  },

  gossip: {
    title: '村外 · 老猎人的木屋',
    text: '木屋墙上挂着七八张兽皮，火塘边坐着个瘸腿的老猎人。他接过你的金币，在掌心掂了掂，才开口：「官道上那商人？他是个好人，可他怕人还价——祖上传下来的规矩，说一不二。你要是敢还，他反倒觉得你是行家，就肯让了。」\n'
      + '他又往火里添了根柴：「还有一句：堡里的石像认剑不认人。你空着手去，它连话都懒得跟你说。」',
    onEnter: { gold: -5, 'flags.knowWeakness': true },
    choices: [
      { text: '谢过猎人，前往官道', goto: 'road' },
      { text: '回村子，再准备准备', goto: 'village' },
    ],
  },

  // ══════════════ 瓶颈 · 古堡大门（M2 将展开堡内探索） ══════════════

  castle: {
    title: '古堡 · 大门',
    text: '古堡大门紧闭，两侧火把在风里摇曳。门洞上方蹲着一尊石像，眼窝里积着雨水，像是在看你。\n'
      + '一个低沉的声音在你脑子里响起，分不清是回声还是别的什么：「持剑者，可入。」\n'
      + '（瓶颈：你带着什么来，决定你怎么进去——也决定了进去之后，堡里的东西怎么看你。）',
    choices: [
      { text: '亮出武器，正门直入（守卫会记住你的脸）', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', do: { 'flags.castleFrontal': true }, goto: 'castle.hall' },
      { text: '等守卫换班的空档溜进去（需情报）', if: 'flags.intelBought', do: { 'flags.castleStealth': true }, goto: 'castle.hall' },
      { text: '徒手闯入', do: { hp: -20 }, goto: 'ending-lose' },
    ],
  },

  'castle.hall': {
    title: '古堡 · 大厅',
    text: '门在你身后合拢，声音像一声叹息。大厅比外面看着更大，穹顶高得看不见顶，只有几束不知从哪儿漏下来的光落在地上。\n'
      + '正对面的墙上是一整幅壁画：一个披甲的人双手举剑，剑身从中断裂，断口迸出的不是血，是光。画的下半截被人为刮掉了，露出底下的石胎。\n'
      + '三条路从大厅分出去：左手回廊黑得看不见尽头，右手门缝里透出烛火，脚下台阶通往地牢。',
    choices: [
      { text: '细看壁画，看能不能看出被刮掉的部分', if: '!flags.sawMural', do: { 'flags.sawMural': true }, goto: 'castle.hall.mural' },
      { text: '趁守卫换班，搜刮大厅（需潜入，没人盯着你）', if: 'flags.castleStealth && !flags.hallLooted', do: { 'flags.hallLooted': true, gold: +6 }, goto: 'castle.hall' },
      { text: '亮了兵器进来的——守卫忌惮你，肯指条明路（需正面进入）', if: 'flags.castleFrontal && !flags.sawMural', goto: 'castle.hall.mural' },
      { text: '点亮火把，进左侧回廊', if: 'items.torch >= 1', goto: 'castle.gallery' },
      { text: '摸黑摸进回廊（看不见，会磕碰）', if: '!items.torch', do: { hp: -3 }, goto: 'castle.gallery' },
      { text: '推开右手的门——壁画给你的提示指向这里', if: 'flags.sawMural', goto: 'castle.library' },
      { text: '下地牢', goto: 'castle.dungeon' },
    ],
  },

  'castle.hall.mural': {
    title: '大厅 · 壁画',
    text: '你凑近了看。刮痕很旧，但刮得很仔细——像是有人不想让后来者看见画的下半截。\n'
      + '借着光，你在被刮掉的地方辨出几笔残迹：一只手，握着剑的**另一半**；那半截断剑不在画中人手里，而是插在一座石台上。\n'
      + '石台的式样，和你身后大门上方那尊石像的底座一模一样。',
    choices: [
      { text: '记在心里，继续查看大厅', goto: 'castle.hall' },
    ],
  },

  'castle.gallery': {
    title: '古堡 · 回廊',
    text: '回廊两侧立着一排排石像，全是从未见过的兽形，每一尊的眼睛都朝着廊道中央——像是在看着每一个从这里走过的人。\n'
      + '越往里走越冷。走到中段，一尊石像的基座上有个浅浅的壁龛，里面似乎搁着什么；再往前，廊道尽头透出一小片天光，那里就是通往地牢的阶梯口。\n'
      + '石像们沉默地看着你。你可以搜，也可以走——但你知道它们会记住你做过什么。',
    choices: [
      { text: '借着火光搜查壁龛（需火把）', if: 'items.torch >= 1 && !items.silver_dagger', do: { 'items.silver_dagger': +1 }, goto: 'castle.gallery' },
      { text: '摸黑在壁龛里乱摸（看不见，只摸到几枚散钱）', if: '!items.torch', do: { gold: +4 }, goto: 'castle.gallery' },
      { text: '不贪，穿过回廊下地牢', goto: 'castle.dungeon' },
      { text: '回大厅', goto: 'castle.hall' },
    ],
  },

  'castle.library': {
    title: '古堡 · 藏书阁',
    text: '推开门，烛火自己亮了起来——像是一直在等什么人来。\n'
      + '书架上没有几本书，只有一册摊开的手记，纸页焦黄，字迹却很新，像昨天才写完：\n'
      + '「剑不是断的，是**分**的。有人怕它太利，把它劈作两半，一半随葬，一半封在此地。合二为一之时，认的不是手，是心。」\n'
      + '落款处被划掉了，只剩下一个墨点，像有人停了很久。',
    choices: [
      { text: '把手记读完，记下真相（决定你能不能把剑拼回去）', if: '!flags.swordLore', do: { 'flags.swordLore': true }, goto: 'castle.library.after' },
      { text: '先不读——知道得越少，走得越轻松（代价：永远拼不回那柄剑）', if: '!flags.swordLore', goto: 'castle.hall' },
      { text: '回大厅', goto: 'castle.hall' },
    ],
  },

  'castle.library.after': {
    title: '藏书阁 · 余烬',
    text: '烛火晃了一下。\n'
      + '你发现手记下面还压着半张图：古堡的剖面，最深处标着"圣所"两个字，旁边画着一柄完整的剑——剑柄朝下，插在一个石台里。\n'
      + '图的边缘有一行小字：「石像鬼守的不是财宝。」\n'
      + '你把图对折收进怀里。无论接下来是拼剑、拔剑，还是掉头就走——至少现在，你知道自己在跟什么东西打交道了。',
    choices: [
      { text: '把图收好，去圣所', goto: 'castle.dungeon' },
      { text: '回大厅，再想想', goto: 'castle.hall' },
    ],
  },

  'castle.dungeon': {
    title: '古堡 · 地牢',
    text: '台阶又窄又陡，墙上的火把早就灭了，越往下空气越浊。\n'
      + '地牢门口站着一个守卫——不是人。它的皮肤是灰白色的，没有眼睛，脸的位置只有一道横缝。听到你的脚步，那道缝缓缓张开了。\n'
      + '它身后是通往上层的阶梯，石阶尽头有光——那就是圣所。\n'
      + '横缝里吐出一句话，不成调，却能听懂：「又一个。」这句话让你后背发凉——它不是第一次说这句话。',
    mode: 'battle',
    battle: {
      enemy: 'guard',
      onWin: 'castle.dungeon.after',
      onLose: 'ending-lose',
      onFlee: 'castle.hall',
    },
  },

  'castle.dungeon.after': {
    title: '地牢 · 阶梯口',
    text: '守卫倒下了，身体像撒了气的皮囊一样瘪下去，最后只剩一层灰。\n'
      + '你从它身上搜出几枚古旧的金币，还有一块铁牌——牌上刻着"圣所守夜人"，背面是编号，编号已经被磨得只剩两道横。\n'
      + '阶梯尽头的光还在。上面就是圣所。',
    choices: [
      { text: '登上圣所', goto: 'castle.sanctum' },
      { text: '先回大厅喘口气', goto: 'castle.hall' },
    ],
  },

  'castle.sanctum': {
    title: '古堡 · 圣所',
    text: '圣所是整座古堡最高的房间，四面无墙，只有一圈石柱撑着穹顶——从这里能看见整片北山。\n'
      + '正中是一座三尺高的石台，台上插着半截断剑，断口朝上，和你手里那把正好对得上。石台旁蹲着石像鬼，和门洞上那尊一模一样，只是这只会呼吸。\n'
      + '它睁开眼，暗红色的光落在你身上，没有立刻动手——它在等你自己决定。',
    choices: [
      { text: '把手里的断剑放回石台，让它们合二为一（需知道真相）', if: 'flags.swordLore && items.broken_sword >= 1', goto: 'ending.sword' },
      { text: '举起你的剑——石像认剑不认人', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', goto: 'ending-win' },
      { text: '举起回廊里得来的银匕首——石像认得堡中的旧物', if: 'items.silver_dagger >= 1', goto: 'ending-win' },
      { text: '拔下石台上那半截，与石像鬼一战', goto: 'castle.sanctum.battle' },
      { text: '悄悄退回去，把这里的一切卖个好价钱（需持剑）', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', goto: 'ending.merc' },
    ],
  },

  'castle.sanctum.battle': {
    title: '圣所 · 石像鬼',
    text: '你的手刚碰到剑柄，石像鬼就站了起来。三米高的身体压下来，石屑从它关节里簌簌落下。\n'
      + '它的声音像两块磨石在互相碾：又一个想把它拼回去的人。\n'
      + '「上一个也这么说。」它抬起了拳头，「上一个现在在墙上。」——你这才注意到，石柱上那些凹凸不平的纹路，并不全是雕花。',
    mode: 'battle',
    battle: {
      enemy: 'golem',
      onWin: 'ending-win',
      onLose: 'ending-lose',
      onFlee: 'castle.hall',
    },
  },

  'ending.sword': {
    title: '结局 · 完整的剑',
    text: '你把断剑放回石台的瞬间，两个断口之间爆出一道白光——不是热，是某种更像"终于"的东西。\n'
      + '剑合拢了。它悬浮在石台上，缓缓转向你。\n'
      + '石像鬼没有阻止。它看着那柄完整的剑，暗红色的光一点点暗下去，最后像熄掉的炭火，归于平静。它守了一辈子，等的不是入侵者，是能把剑拼好的人。\n'
      + '（BEST END）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'ending.merc': {
    title: '结局 · 好价钱',
    text: '你没有碰那柄剑，也没有惊动石像鬼。你记住了路，记住了石台的样子，然后原路退了出去。\n'
      + '三个月后，城里的收藏家为一张古堡剖面图付了三百枚金币。他没有问图是谁画的，你也没有说石台上还插着半截断剑。\n'
      + '你变得很富有。只是偶尔在夜里，你会想起穹顶下那圈石柱，和石像鬼看你的眼神——它没有拦你，那才是最难受的部分。\n'
      + '（GOOD END · 商人结局）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'ending-win': {
    title: '结局 · 剑之认主',
    text: '石门轰鸣而开。你举起剑，剑身迸出一道刺目的金光，光芒顺着你的手臂蔓延到全身——它认你为主。\n'
      + '「{name}，古堡的新主人。」那个古老的声音最后一次回荡在殿堂里，随后归于寂静。\n'
      + '（你带着剑走了出去。至于剑为什么会断、断掉的另一半在谁手里——那是以后的事。）',
  },

  'ending-lose': {
    title: '结局 · 荒山野岭',
    text: '石像抬起了手。你只觉得像被一堵墙拍中，整个人飞了出去，肋骨发出令人牙酸的声响。\n'
      + '再醒来时，天已经黑了。你躺在山下的乱石堆里，浑身剧痛，剑早已不知去向。有只夜鸟落在旁边，歪着头看了你一会儿，又飞走了。\n'
      + '古堡在暮色里沉默地立着，像什么都没发生过——对它来说，你确实什么都没做过。\n'
      + '（BAD END）',
    choices: [
      { text: '再来一次', goto: '@restart' },
    ],
  },

  // ══════════════ 支线 · 试炼场（战斗系统 DLC） ══════════════

  arena: {
    title: '试炼场 · 独眼狼',
    text: '试炼场的铁门在身后关上。看台上零星坐着几个赌客，看见你进场，懒洋洋地抬起眼皮。\n'
      + '一头独眼狼从阴影里踱出来——和林子里的那头不太一样，这头瞎的是右眼，左眼里全是斗过的痕迹。\n'
      + '这里没有退路，只有胜负。看台上有人开始下注，赔率对你不太友好。',
    mode: 'battle',
    battle: {
      enemy: 'wolf',
      onWin: 'arena-win',
      onLose: 'arena-lose',
      onFlee: 'village',
    },
  },

  'arena-win': {
    title: '试炼场 · 胜者',
    text: '独眼狼倒下了，看台上传来零星的喝彩，也有人骂骂咧咧地把铜板推给邻座。\n'
      + '一个管事模样的人走过来，往你手里塞了个钱袋：「不错，比上一个撑得久。要不要试试石像鬼？那才是真正的怪物。」\n'
      + '他顿了顿，压低声音：「不过提醒你——上一个挑战它的，连名字都没留下。我们这儿的规矩是，赢了才有名字。」',
    choices: [
      { text: '挑战石像鬼', goto: 'arena-boss' },
      { text: '见好就收，回村子', goto: 'village' },
    ],
  },

  'arena-boss': {
    title: '试炼场 · 石像鬼',
    text: '地面开始震颤。三米高的石像鬼从看台后方的铁笼里走出来，每走一步都在地上留下一个浅坑。它的眼睛是两团暗红色的光，呼吸声像风箱在拉。\n'
      + '管事退到了安全距离外，朝你比了个"自求多福"的手势，然后钻进了看台下的铁棚里——那棚子显然不是第一次派上用场。',
    mode: 'battle',
    battle: {
      enemy: 'golem',
      onWin: 'arena-boss-win',
      onLose: 'arena-lose',
      onFlee: 'arena-win',
    },
  },

  'arena-boss-win': {
    title: '结局 · 试炼之王',
    text: '石像鬼轰然碎裂，碎石堆成一座小山。在瓦砾中央，一枚暗红色的核心还在跳动，像一颗心脏。\n'
      + '看台沸腾了。管事扯着嗓子喊：「试炼之王！这位是新的试炼之王！」\n'
      + '你举起核心，心里想的却是古堡里那柄断掉的剑——它的一半，会不会也在这里？',
    onEnter: { 'flags.arenaChampion': true },
    choices: [
      { text: '带着核心回村子', goto: 'village' },
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'arena-lose': {
    title: '结局 · 试炼场之殇',
    text: '你倒下了。沙土吸饱了血，看台上一片寂静，随即响起稀稀落落的叹息——赌客们只是输了几枚金币，明天照旧；而你在意的那些东西，也一起留在了这里。\n'
      + '有人开始往外走，有人已经在讨论下一场。管事蹲下来，翻了翻你的钱袋，摇摇头走了。\n'
      + '沙土很凉。你最后看见的是看台缝隙里漏下来的一线天光。\n'
      + '（BAD END）',
    choices: [
      { text: '再来一次', goto: '@restart' },
    ],
  },
}

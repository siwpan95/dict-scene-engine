// 《荒漠商队》主线条形内容包（M6）
// 结构：hub-and-spoke —— caravan.camp 是营地枢纽，9 条 spoke 各查完回营地
// 主题：贸易 + 战斗 + 道德选择，3 个结局（商队之王 / 隐者 / 散伙）
// 状态：gold（财富）、karma（善恶，善举+1 恶举-1），复用引擎插值
//
// 复用引擎特性：文本插值（title/choice.text）、条件选项、battle 模式、@restart

export default {
// ══════════════ 营地枢纽 ══════════════

'caravan.camp': {
  title: '荒漠 · 商队营地（金币 {gold} · 善名 {karma}）',
  text: '夕阳把沙丘染成铁锈色。你的商队在背风处扎了营，二十几头骆兽卧成一圈，驮着盐和丝绸。\n'
    + '这是你接手商队的第一程。前面的路有三条传说：北边有黑市，东边有绿洲，西边是盗匪出没的沙丘。\n'
    + '（营地是你的据点，随时可以回来重整。每条线索查完都会回到这里。）',
  choices: [
    { text: '去南边贸易站办张牌照', if: '!flags.tradeLicense', goto: 'caravan.trade' },
    { text: '去北边黑市转转', goto: 'caravan.market' },
    { text: '去东边绿洲休整', goto: 'caravan.oasis' },
    { text: '去西边沙丘探路', goto: 'caravan.dunes' },
    { text: '收留路过的难民车队', if: '!flags.helpedRefugee', goto: 'caravan.refugee' },
    { text: '跟老商人打听门道', if: '!flags.heardMerchant', goto: 'caravan.merchant' },
    { text: '问斥候前路的凶险', if: '!flags.heardScout', goto: 'caravan.scout' },
    { text: '查商队的账本', if: '!flags.readLedger', goto: 'caravan.ledger' },
    { text: '夜里围着营火，听老人讲讲门道', if: '!flags.heardSong', goto: 'caravan.song' },
    { text: '途中遇上沙暴，先找地方躲一躲', if: '!flags.rodeStorm && !flags.racedStorm', goto: 'caravan.storm' },
    { text: '循着古商道图，去找废弃的石堡遗迹', if: 'items.caravan_map >= 1', goto: 'caravan.ruin' },
    { text: '面对合伙人，把这一程的事说开', if: 'flags.readLedger && !flags.metPartner', goto: 'caravan.partner' },
    { text: '够了，做最后的决断', goto: 'caravan.fork' },
  ],
},

// ══════════════ 勘察 / 互动（spoke） ══════════════

'caravan.trade': {
  title: '南边 · 贸易站',
  text: '贸易站是座石头垒的方城，门口挂着七大城联号的铜牌。管事的是个戴眼镜的瘦子，翻着一本比砖还厚的册子。\n'
    + '「行商牌照，四十金一枚，有效期一辈子。有了它，七大城的总栈才认你的货。」他推了推眼镜，「没它，你跑断腿也是私商。」',
  choices: [
    { text: '花 20 金办一张贸易牌照', if: '!flags.tradeLicense && gold >= 20', do: { gold: -20, 'flags.tradeLicense': true }, goto: 'caravan.camp' },
    { text: '回营地，继续这一程', goto: 'caravan.camp' },
  ],
},

'caravan.market': {
  title: '北边 · 黑市',
  text: '黑市的帐篷用骆驼皮扎成，卖的东西来路不明：锁过的箱子、没有封印的香料、还有人低声问你要不要"免税的盐"。\n'
    + '一个独眼贩子凑过来：「走私一车，抵你跑三趟正当买卖。被抓了算你自己的。」',
  choices: [
    { text: '接下走私的活，赚笔快的（善名 -1）', if: '!flags.smuggled', do: { gold: +30, 'flags.smuggled': true, karma: -1 }, goto: 'caravan.camp' },
    { text: '向巡沙使举报这个黑市（善名 +1）', if: '!flags.reportedMarket', do: { 'flags.reportedMarket': true, karma: +1 }, goto: 'caravan.camp' },
    { text: '什么都不沾，回营地', goto: 'caravan.camp' },
  ],
},

'caravan.oasis': {
  title: '东边 · 绿洲',
  text: '绿洲不大，一汪水嵌在石缝里，周围生着几丛灌木。你的骆兽渴坏了，但先到的一支小商队正在独占水源，不许旁人靠近。\n'
    + '他们的头领看向你：「这水是我们先发现的。要么你出钱买，要么绕路。」',
  choices: [
    { text: '出钱买水，也分一口给路过的穷人（善名 +1）', if: '!flags.sharedOasis && gold >= 5', do: { gold: -5, 'flags.sharedOasis': true, karma: +1 }, goto: 'caravan.camp' },
    { text: '亮出兵刃，抢下水源自己独享', if: '!flags.hoardedOasis', do: { 'flags.hoardedOasis': true, karma: -1 }, goto: 'caravan.camp' },
    { text: '不争不抢，绕路去找别的水，回营地', goto: 'caravan.camp' },
  ],
},

'caravan.dunes': {
  title: '西边 · 沙丘',
  text: '沙丘在风里流动，像活的。你爬上最高的那道脊，风把细沙打在脸上。\n'
    + '脊线背风的一面，半埋着一截风化了的木牌——上面刻着一条古商道，通往一片没在地图外的盐湖。你用炭条把路线描了下来。',
  choices: [
    { text: '记下这条秘道（得古商道图）', if: '!items.caravan_map', do: { 'items.caravan_map': +1 }, goto: 'caravan.camp' },
    { text: '继续往沙丘深处走（听说有盗匪出没）', goto: 'caravan.bandits' },
    { text: '风太大，先回营地', goto: 'caravan.camp' },
  ],
},

'caravan.refugee': {
  title: '路过的难民',
  text: '一支难民车队被沙暴冲散了，老人和孩子蜷在驼峰阴影里。他们的头人向你行了个商队礼：「我们只求一口水、一夜歇脚。明早天不亮就走，不白拿。」\n'
    + '你的补给本就不宽裕。\n'
    + '但你知道，商队最怕的不是沙暴，是见死不救落下的名声——这一程走完，背不背得起这个名字，比袋里的金子更要紧。',
  choices: [
    { text: '收留他们过夜，分出口粮（善名 +1）', if: '!flags.helpedRefugee', do: { 'flags.helpedRefugee': true, karma: +1 }, goto: 'caravan.camp' },
    { text: '赶他们走，商队经不起拖累', if: '!flags.droveRefugee', do: { 'flags.droveRefugee': true, karma: -1 }, goto: 'caravan.camp' },
  ],
},

'caravan.merchant': {
  title: '老商人',
  text: '营地角落里坐着个胡子花白的老商人，他看你的眼神像在看当年的自己。\n'
    + '他脚边搁着当年跑商的旧驼铃，铃舌早锈死了，却还擦得发亮。\n'
    + '「年轻人，商队最难的不是赚钱，是信错人。你的合伙人——那个管账的——我见过他从前东家那儿卷了货走。你自己留个心。」',
  choices: [
    { text: '记下这话，回头查账', if: '!flags.heardMerchant', do: { 'flags.heardMerchant': true }, goto: 'caravan.camp' },
  ],
},

'caravan.scout': {
  title: '斥候',
  text: '你的斥候刚从西边回来，鞍上挂着半截断箭。\n'
    + '他摘下水囊灌了一口，抹了抹嘴才开口，风里的沙还没从牙缝里剔干净。\n'
    + '「沙丘后面有伙沙盗，专挑落单的商队。但他们怕一样东西——火。夜里在营周围点起一圈火把，他们不敢近。」\n'
    + '他说完嘿嘿一笑：「当然，火把得省着点，咱带的不多。」',
  choices: [
    { text: '记住火防沙盗的法子', if: '!flags.heardScout', do: { 'flags.heardScout': true }, goto: 'caravan.camp' },
  ],
},

'caravan.ledger': {
  title: '商队账本',
  text: '你趁合伙人不在，翻开了那本羊皮账。数字对不上：有三车货记着"途中损耗"，可你明明记得那几车平安到了。\n'
    + '差额不小，都流向了城里一个你不认识的户头。\n'
    + '你的合伙人，在偷偷掏空这支商队——可你想起他平日里对伙计们不错，一时分不清他是贪，还是真有难处。',
  choices: [
    { text: '把这笔账记在心里', if: '!flags.readLedger', do: { 'flags.readLedger': true }, goto: 'caravan.camp' },
  ],
},

// ══════════════ 战斗（盗匪来袭） ══════════════

'caravan.bandits': {
  title: '沙丘 · 盗匪',
  text: '你刚翻过沙丘脊线，一伙沙盗从背风面冒出来，裹着破帆布，手里的弯刀映着残阳。\n'
    + '「商队的，留下货，饶你命。」领头的咧嘴一笑，牙上沾着沙。\n'
    + '你数了数，七个。刀没开过几次刃，人却个个像饿了三天——这种亡命徒，要么你倒下，要么他们散进风里，没有第三条路。',
  mode: 'battle',
  battle: {
    enemy: 'bandit',
    onWin: 'caravan.bandits.win',
    onLose: 'ending.caravan-broke',
    onFlee: 'caravan.camp',
  },
},

'caravan.bandits.win': {
  title: '击退沙盗',
  text: '沙盗溃散进风里，你从他们丢下的褡裢里翻出几枚钱币，还有一张揉皱的纸条——上面画着你们商队下一步要走的路线。\n'
    + '有人把行踪卖给了沙盗。你的视线不由得飘向管账合伙人的帐篷。\n'
    + '风把纸条一角吹起来，你认出那笔迹——圆熟，带着记账人特有的那种顿挫。你把它折好，塞进了贴身的口袋。',
  choices: [
    { text: '收好纸条和钱币，回营地', do: { gold: +12 }, goto: 'caravan.camp' },
  ],
},

// ══════════════ 合伙人对峙 ══════════════

'caravan.partner': {
  title: '面对合伙人',
  text: '你把账本摊在合伙人面前。他先是一愣，随即苦笑：「你查我了。」\n'
    + '「我家里老娘病着，药比金子贵。我没想卷走全部——就挪了一点，打算赚了还回去。」\n'
    + '他盯着你的手，等你的决断。',
  choices: [
    { text: '原谅他，但要他当众对账、立字据（善名 +1）', if: '!flags.metPartner', do: { 'flags.metPartner': true, 'flags.partnerReformed': true, karma: +1 }, goto: 'caravan.camp' },
    { text: '卷了他挪走的那笔钱，趁夜独自溜走', if: '!flags.metPartner', do: { 'flags.metPartner': true, 'flags.betrayedPartner': true, gold: +20, karma: -2 }, goto: 'caravan.camp' },
  ],
},

// ══════════════ 额外探索 / 事件（spoke） ══════════════

'caravan.storm': {
  title: '途中 · 沙暴',
  text: '你刚翻过沙丘脊线，天就黑了——不是夜，是沙。整片天空像被一只手掀了起来，黄蒙蒙的墙朝你压过来。\n'
    + '老商人拽住你的袖子：「趴下！把脸埋进驼峰的影子里，沙暴过去之前别抬头！」\n'
    + '风灌进耳朵，像有人在远处擂鼓。你攥紧了缰绳，等这一口气过去。',
  choices: [
    { text: '听老商人的，趴下护住驼队（善名 +1）', if: '!flags.rodeStorm', do: { 'flags.rodeStorm': true, karma: +1 }, goto: 'caravan.camp' },
    { text: '冒沙往前冲，想抢在沙暴前赶到驿站', if: '!flags.racedStorm', do: { 'flags.racedStorm': true, hp: -8 }, goto: 'caravan.camp' },
  ],
},

'caravan.ruin': {
  title: '古商道 · 遗迹',
  text: '循着木牌上的古商道，你在一座风蚀的石堡前停下。堡门塌了半边，门楣上刻着一行褪色的字：「行商者，先量良心，再量货。」\n'
    + '堡内空空，只在墙角堆着几只碎了的陶罐——罐底压着一枚旧铜符，符上的人面似笑非笑，像在考你肯不肯贪这点死人财。',
  choices: [
    { text: '把铜符收进怀里（也许值钱）', if: '!items.relic_charm', do: { 'items.relic_charm': +1 }, goto: 'caravan.camp' },
    { text: '不碰死人的东西，留它在原处', if: '!flags.leftRelic', do: { 'flags.leftRelic': true, karma: +1 }, goto: 'caravan.camp' },
  ],
},

'caravan.song': {
  title: '营火夜谈',
  text: '夜里，几支商队凑在一堆营火边。老商人摸出那枚锈死的驼铃，轻轻敲了一下，没声，他却笑了。\n'
    + '「我跑了一辈子商，攒下的不是金子，是这一路认得的人。你今天肯分水给难民、肯信那个犯错的伙计——这比什么牌照都值钱。」\n'
    + '火光里，有人起了个头，荒调子顺着风飘出去，听不清词，却让人不想睡。',
  choices: [
    { text: '坐下来，听他们唱完这一夜', if: '!flags.heardSong', do: { 'flags.heardSong': true }, goto: 'caravan.camp' },
  ],
},


// ══════════════ 决策点 ══════════════

'caravan.fork': {
  title: '最后的决断',
  text: '这一程走到头了。前面的岔路通向三样东西：\n'
    + '北边是七大城联号的总栈，认钱也认招牌；东边是无名绿洲，听说有人在哪儿一待就是一辈子；而你脚下这条，通向散伙的各奔东西。\n'
    + '你掂量着自己攒下的（金币 {gold}）和一路攒下的名声（善名 {karma}），做了决定。',
  choices: [
    { text: '凭贸易许可证，去七大城联号做大宗买卖（需许可证）', if: 'flags.tradeLicense && gold >= 20', goto: 'ending.caravan-king' },
    { text: '把赚的钱分给一路帮过你的人，自己留在绿洲（需善名 ≥ 2）', if: 'karma >= 2', goto: 'ending.caravan-hermit' },
    { text: '什么也不留恋，商队散伙，各走各路', goto: 'ending.caravan-broke' },
  ],
},

// ══════════════ 结局 ══════════════

'ending.caravan-king': {
  title: '结局 · 商队之王',
  text: '七大城联号的总栈高得看不见顶。你递上贸易许可证，掌柜的眯眼打量你半天，最后笑着让了座。\n'
    + '十年后，北漠的商道上跑的都是你名下的驼队，盐与丝绸的价，你一句话就能定。当年的难民、老商人、斥候，都成了你旗下的人。\n'
    + '你偶尔想起那个想掏空商队的合伙人——他早被你遣去管了最偏的驿栈，再没机会伸手。\n'
    + '（GOOD END · 你靠本事和牌照，成了荒漠上说了算的人）',
  choices: [
    { text: '再玩一次', goto: '@restart' },
  ],
},

'ending.caravan-hermit': {
  title: '结局 · 绿洲隐者',
  text: '你把这一程赚的金币分给了难民、老商人的孙女、还有那个替你探路的斥候。驼队散了，你独自留在东边的无名绿洲。\n'
    + '水还是那汪水，灌木还是那几丛。但路过的人都说，绿洲边多了个肯分一口水的老人，脾气好，从不赶人。\n'
    + '你没成什么王，也没赚什么大钱。只是夜里听着风声，觉得这一程走得值。\n'
    + '（TRUE END · 你放下了算计，留下了善名）',
  choices: [
    { text: '再玩一次', goto: '@restart' },
  ],
},

'ending.caravan-broke': {
  title: '结局 · 商队散伙',
  text: '你什么决断也没做，或者做了却没底气。商队在一个无名的黎明解散，骆兽各奔东西，盐袋被风掀开一角。\n'
    + '有人后来在七大城见过你，替人赶驼，再没自己的旗号。也有人说他看见你一个人在绿洲边坐着，谁也没认出那就是当年商队的头。\n'
    + '（NEUTRAL END · 这一程，你既没成王，也没成隐者，只是过去了）',
  choices: [
    { text: '再玩一次', goto: '@restart' },
  ],
},
}

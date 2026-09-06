// 武侠短篇《刀客》（M9 / Phase 3 · 多风格内容库）
// ⚠️ ESM 模块，加载即执行 —— 只装载可信来源（见 README 安全须知）
//
// 风格：古典武侠。结构：线性追查 + 道德分叉（正大光明 / 阴损算计 / 顿悟放下）。
// 战斗：复用 battle 模式（敌人 robber 山贼 / nemesis 仇家）。
// 状态：flags.honor（磊落行为计数）、items.school_jade（师门遗物）、karma 复用。

export default {
  'wuxia.start': {
    title: '风陵渡 · 客栈',
    text: '黄沙漫过关口，你在风陵渡的客栈里擦刀。刀是师父的遗物，刃口卷了两处，像两条没说完的话。\n'
      + '邻桌的商队在低声说：「北边山里，前些天有人见过"铁爪"陈九。那老东西灭了青松门满门，躲了十年，到底露了行踪。」\n'
      + '你手上停了停。十年前那场火，你记得每一张脸。如今仇人的名字从别人嘴里说出来，像往伤口上浇了一瓢冷酒。',
    choices: [
      { text: '向商队问清铁爪陈九的藏身处', goto: 'wuxia.road' },
      { text: '先上街置办点行头再动身', goto: 'wuxia.town' },
    ],
  },

  'wuxia.road': {
    title: '北山 · 官道',
    text: '出渡口往北，官道越走越窄，最后变成一条兽道。你听见前面有刀兵声——一伙山贼截住了一辆送药的驴车，车上躺着个烧得迷糊的老汉。\n'
      + '山贼头子回头看见你，咧嘴：「刀客？这趟浑水，劝你当没看见。」',
    choices: [
      { text: '拔刀，管这一桩（与山贼一战）', goto: 'wuxia.road.battle' },
      { text: '绕过去——你的仇在北边，不在路上', do: { 'flags.skippedRobbers': true, karma: -1 }, goto: 'wuxia.temple' },
    ],
  },

  'wuxia.road.battle': {
    title: '北山 · 山贼',
    text: '你按住刀柄，山贼头子的笑容僵在脸上。五个人缓缓围上来，脚步很轻，像五只闻着血腥味的豺。\n'
      + '「给你脸不要。」头子啐了一口，「剁了他，驴车也归咱们。」\n'
      + '风把官道上的尘土卷成一道黄幕，你的刀慢慢出鞘，发出一声轻响，像雪落在铁上。\n'
      + '十步之内，你从不问对方有几个人。',
    mode: 'battle',
    battle: { enemy: 'robber', onWin: 'wuxia.road.after', onLose: 'wuxia.end-dead', onFlee: 'wuxia.temple' },
  },

  'wuxia.road.after': {
    title: '北山 · 驴车旁',
    text: '山贼四散逃进林子里，头子跑得比谁都快，半只鞋都丢了。\n'
      + '驴车上的老汉烧得说胡话，含含糊糊念着「多谢侠士」。你扶他坐正，把水囊塞进他手里，心里那团烧了十年的火，好像被这口水浇小了一点。\n'
      + '老汉的手粗糙得像树皮，抓着你手腕不撒开，你等他睡实了，才轻轻抽回手。',
    choices: [
      { text: '继续赶路，往北山深处去', do: { 'flags.savedOldMan': true, karma: +1 }, goto: 'wuxia.temple' },
    ],
  },

  'wuxia.town': {
    title: '风陵渡 · 药铺',
    text: '药铺的掌柜是个见过世面的人，你问起铁爪陈九，他脸色变了变，把你让进里间。\n'
      + '「陈九十年前灭青松门，为的是一块暖玉。玉没找到，他才躲进山里。你寻他，最好先备两样东西：防他爪上毒粉的解药，还有……一样能让他分神的物件。」\n'
      + '他把一包药粉推过来：「十金。老规矩，不问去处。」',
    choices: [
      { text: '买下解药（-10 金）', if: 'gold >= 10', do: { gold: -10, 'items.antidote': +1 }, goto: 'wuxia.town.after' },
      { text: '不买，刀够快就行', goto: 'wuxia.town.after' },
    ],
  },

  'wuxia.town.after': {
    title: '风陵渡 · 街口',
    text: '你出了药铺，正撞见一队官差往北去，说是剿山贼。领头的朝你拱了拱手：「北山路险，侠士当心。」\n'
      + '你忽然想，若师父还在，会不会笑你为了一个仇字走了十年。风卷着黄沙，把那点念头又吹散了。\n'
      + '你按了按怀里那包解药，刀柄在掌心凉得发烫。',
    choices: [
      { text: '出城，上北山', goto: 'wuxia.temple' },
    ],
  },

  'wuxia.temple': {
    title: '北山 · 古庙',
    text: '山腰有座破庙，你在庙里避风。佛像塌了半边，香案前却坐着一个扫地的老僧。\n'
      + '「施主刀上的怨气，比这山里的雾还重。」老僧头也不抬，「十年前那场火，烧了青松门，也把你烧成了今天这副模样。可你想过没有——陈九躲了十年，他夜里可曾睡过一觉好觉？」\n'
      + '扫帚一下一下，像扫在你心上。',
    choices: [
      { text: '「他睡不睡得着，与我何干。」', goto: 'wuxia.cliff' },
      { text: '听老僧把话说完', goto: 'wuxia.temple.talk' },
    ],
  },

  'wuxia.temple.talk': {
    title: '北山 · 古庙夜话',
    text: '老僧放下扫帚，给你倒了碗凉水：「报仇的人，刀出鞘时，自己也就死了一半。陈九当年抢玉，是为了救他女儿。后来他女儿也没了——他那条命，早就不是为自己活的了。」\n'
      + '「施主，刀是你的，路也是你的。只是上山之前，问自己一句：你要的是那口刀下去的快意，还是这十年的债，想有个了结。」',
    choices: [
      { text: '「我要的是了结。」起身出庙', if: '!flags.heardMonk', do: { 'flags.heardMonk': true }, goto: 'wuxia.cliff' },
      { text: '「了结之后呢？」继续问', if: '!flags.heardMonk', do: { 'flags.heardMonk': true, 'flags.monkDeep': true }, goto: 'wuxia.temple.answer' },
    ],
  },

  'wuxia.temple.answer': {
    title: '北山 · 古庙 · 拂晓',
    text: '「了结之后，你要么带着空落落的刀下山，要么——」老僧抬手指了指庙外的山，「在这山里，把刀放下。」\n'
      + '天边发白。老僧又拿起扫帚，像什么都没说过。你忽然觉得，这庙里比外面暖。\n'
      + '扫帚扫过青石，一下，又一下，像在扫你心里积了十年的灰。',
    choices: [
      { text: '还是上山', goto: 'wuxia.cliff' },
      { text: '把刀留在庙里，下山去', if: 'flags.monkDeep', goto: 'wuxia.end-letgo' },
    ],
  },

  'wuxia.cliff': {
    title: '北山 · 断崖',
    text: '断崖上，一个人背对你站着。十年了，他的背还是那么挺。\n'
      + '「青松门的小子。」陈九转过身，铁爪在袖口泛着冷光，「我每晚都梦见那场火。你今天来，正好。」\n'
      + '风从崖底往上灌，你的刀在鞘里轻轻响了一声。',
    choices: [
      { text: '拔刀，堂堂正正一战', goto: 'wuxia.cliff.battle' },
      { text: '撒出在药铺配的迷粉再动手（若买了毒粉）', if: 'items.antidote >= 1', do: { 'flags.dirtyFight': true, karma: -1 }, goto: 'wuxia.cliff.battle' },
    ],
  },

  'wuxia.cliff.battle': {
    title: '北山 · 断崖对决',
    text: '两道身影同时动了。陈九的铁爪撕裂空气，你的刀光如一线残月。\n'
      + '这一战没有旁人，没有江湖，只有十年积攒的一口气，和一条命的了结。\n'
      + '崖下风急，两个人的影子在雪地上缠在一起，分不清谁在追，谁在躲。\n'
      + '你听不见风声了，眼里只剩那对铁爪，和师父教你的最后一刀。',
    mode: 'battle',
    battle: { enemy: 'nemesis', onWin: 'wuxia.cliff.after', onLose: 'wuxia.end-dead', onFlee: 'wuxia.end-dead' },
  },

  'wuxia.cliff.after': {
    title: '北山 · 断崖 · 雪',
    text: '陈九倒在崖边，胸口插着你的刀。他的嘴角动了动，像笑，又像松了口气。\n'
      + '「小子……你师父的玉，我没拿。火……是别人放的。」他说完这句，眼里的光就散了。\n'
      + '北山的雪落下来，盖住了血，也盖住了这十年。',
    choices: [
      { text: '下山，把这笔债埋了', if: 'flags.dirtyFight', goto: 'wuxia.end-mutual' },
      { text: '下山，把这笔债埋了', if: '!flags.dirtyFight', goto: 'wuxia.end-vengeance' },
    ],
  },

  'wuxia.end-vengeance': {
    title: '结局 · 刀客 · 了结',
    text: '你下了山，刀还在背上，只是轻了许多。\n'
      + '有人问你北山上发生了什么，你说：「下了场雪。」\n'
      + '后来你在风陵渡开了一间小武馆，教孩子们使刀。刀法还是师父教的，只是少了最后一招——那一招，你把它和仇人的血一起，留在了断崖上。\n'
      + '（GOOD END · 你光明正大地了结了这十年，刀上没有阴损的灰）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'wuxia.end-mutual': {
    title: '结局 · 刀客 · 毒',
    text: '你赢了，但你清楚，赢得很脏。\n'
      + '下山后，你的手开始发抖——药铺的粉，你配错了分量。那点毒渗进了你自己的伤口。\n'
      + '江湖上再没人见过你。只传说北山断崖边的雪地里，多了一把卷了刃的刀，刀柄上刻着半句没刻完的诗。\n'
      + '（BAD END · 你用了阴损的手段，赢了仇，也输了自己）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'wuxia.end-letgo': {
    title: '结局 · 刀客 · 放下',
    text: '你把刀留在了古庙里。刀搁在香案上，压着老僧抄了一半的经。\n'
      + '「不去了？」老僧问。你摇摇头：「去了，也不知道该问谁。」\n'
      + '山下的日子很慢。你跟着老僧学种菜、劈柴、抄经。偶尔有年轻的刀客上山，问你江湖上的事，你就给他们倒一碗水。\n'
      + '（TRUE END · 你把仇放下了，也把自己从十年的火里捡了回来）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'wuxia.end-dead': {
    title: '结局 · 刀客 · 死',
    text: '刀没有快过命。\n'
      + '北山的雪落在你身上，你忽然想起师父说过：刀客的最后一口气，都是留给山的。\n'
      + '雪一层层盖下来，像要把你和这十年一起埋了。山还是那座山，只是从此少了一个赶路的人。\n'
      + '（BAD END · 你倒在了路上，仇人的名字成了别人茶余饭后的一句闲话）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },
}

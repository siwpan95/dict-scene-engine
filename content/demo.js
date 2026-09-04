// 示例场景字典：《古堡寻剑》
// 一个内容包 = 一个导出场景字典的 JS 模块（纯数据，零引擎代码）
//
// 覆盖引擎全部特性：
//   - 文本插值      {name} {hp} {gold}
//   - 条件选项      if: 'gold >= 10' / 'flags.knowWeakness'
//   - 状态效果      do: { hp: -8 } / onEnter: { items.broken_sword: +1 }
//   - 多结局分支    无 choices = 结局场景
//   - 特殊跳转      goto: '@restart' 重开游戏
//
// 换内容包 = 在 cordis.yml 的 scenes.config.packs 里换一行。

export default {
  start: {
    title: '村庄 · 晨雾',
    text: '{name}，你在晨雾中醒来。今日，你要前往北山古堡，寻找失落之剑。出发前，你掂量了一下自己：HP {hp}，金币 {gold}。',
    choices: [
      { text: '走林间小路（更快，但传言有狼）', goto: 'forest' },
      { text: '走官道大路（安全，但绕远）', goto: 'road' },
      { text: '花 5 金币向老猎人打听情报', if: 'gold >= 5', goto: 'gossip' },
      { text: '登船前往第七星港（DLC）', goto: 'starport-hub' },
      { text: '前往试炼场（战斗系统 DLC）', goto: 'arena' },
    ],
  },

  arena: {
    title: '试炼场 · 独眼狼',
    text: '试炼场的铁门在身后关上。一头独眼狼从阴影里踱出——这里没有退路，只有胜负。',
    mode: 'battle',                 // 非 normal 模式：由 combat 插件接管输入与界面
    battle: {
      enemy: 'wolf',
      onWin: 'arena-win',
      onLose: 'arena-lose',
      onFlee: 'start',
    },
  },

  'arena-win': {
    title: '试炼场 · 胜者',
    text: '独眼狼倒下了。看台上传来欢呼：「不错。要不要挑战石像鬼？那可是真正的怪物。」',
    choices: [
      { text: '挑战石像鬼', goto: 'arena-boss' },
      { text: '见好就收，回村庄', goto: 'start' },
    ],
  },

  'arena-boss': {
    title: '试炼场 · 石像鬼',
    text: '地面震颤。三米高的石像鬼睁开岩石铸就的眼睛，每一次呼吸都像风箱在拉。',
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
    text: '石像鬼轰然碎裂。你举起核心，试炼场沸腾了——「试炼之王」的名号，从此归你。',
    onEnter: { 'flags.arenaChampion': true },
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'arena-lose': {
    title: '结局 · 试炼场之殇',
    text: '你倒下了。试炼场的沙土浸透鲜血，观众席一片寂静。\n（BAD END）',
    choices: [
      { text: '再试一次', goto: '@restart' },
    ],
  },

  forest: {
    title: '林间小路',
    text: '幽暗的树林里，一只独眼狼拦住了去路，绿油油的眼睛盯着你。',
    choices: [
      { text: '正面迎战！', if: 'hp >= 10', do: { hp: -8 }, goto: 'wolf-win' },
      { text: '绕路逃走（损失 3 HP）', do: { hp: -3 }, goto: 'road' },
      { text: '扔 5 枚金币引开它', if: 'gold >= 5', do: { gold: -5 }, goto: 'road' },
    ],
  },

  'wolf-win': {
    title: '狼穴',
    text: '一番搏斗后你战胜了独眼狼。狼穴里，你发现它守护着一柄断剑！',
    onEnter: { 'items.broken_sword': +1 },
    choices: [
      { text: '收起断剑，继续赶路', goto: 'castle' },
    ],
  },

  gossip: {
    title: '老猎人的木屋',
    text: '老猎人收下金币，神秘一笑：「古堡的商人，最怕人还价。」',
    onEnter: { gold: -5, 'flags.knowWeakness': true },
    choices: [
      { text: '谢过猎人，前往官道', goto: 'road' },
    ],
  },

  road: {
    title: '官道 · 驿站',
    text: '大路尽头，一个神秘商人拦住你：「小伙子，看你面有煞气。这柄锈剑，10 金币卖你保命，如何？」',
    choices: [
      { text: '10 金币，成交', if: 'gold >= 10', do: { gold: -10, 'items.rusty_sword': +1 }, goto: 'castle' },
      { text: '讨价还价：「5 金币，不然算了」', if: 'flags.knowWeakness', do: { gold: -5, 'items.rusty_sword': +1 }, goto: 'castle' },
      { text: '不买，继续赶路', goto: 'castle' },
    ],
  },

  castle: {
    title: '古堡 · 大门',
    text: '古堡大门紧闭，两侧火把摇曳。一尊石像低语：「持剑者，可入。」',
    choices: [
      { text: '亮出武器', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', goto: 'ending-win' },
      { text: '徒手闯入', do: { hp: -20 }, goto: 'ending-lose' },
    ],
  },

  'ending-win': {
    title: '结局 · 剑之认主',
    text: '石门轰鸣而开。你举起剑，失落之剑发出耀眼金光——它认你为主！\n「{name}，古堡的新主人。」一个古老的声音回荡在殿堂。',
  },

  'ending-lose': {
    title: '结局 · 荒山野岭',
    text: '石像一拳将你拍飞。你在荒山野岭中醒来，浑身剧痛。\n（BAD END）',
    choices: [
      { text: '再试一次', goto: '@restart' },
    ],
  },
}

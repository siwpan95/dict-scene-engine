// 示例场景字典（内容包 2）：《星港潜行》DLC
// 演示：多内容包叠加（cordis.yml packs 列表第二个）、跨包跳转、
//       深层状态、消耗型条件、@restart、成就钩子（scene ID 匹配）

export default {
  'starport-hub': {
    title: '星港 · 空港大厅',
    text: '霓虹灯牌在雨幕中化开一道道彩色的水痕。这里是第七星港——走私者的天堂，也是所有人假装看不见彼此的地方。\n'
      + '接你这趟活的中间人只说了一句话：货舱最深处那枚数据核心，拿到手，钱货两清。至于核心里是什么，他劝你别问。\n'
      + '雨越下越大。你可以现在就掉头回去——没人会拦你，也没人会记得你来过。',
    choices: [
      { text: '潜入货舱区', goto: 'starport-cargo' },
      { text: '去「红矮星」酒吧打听', if: 'gold >= 1', do: { gold: -1 }, goto: 'starport-bar' },
      { text: '掉头返回村庄', goto: 'start' },
    ],
  },

  'starport-cargo': {
    title: '星港 · 货舱区',
    text: '货舱里堆满贴着各色封条的走私箱，空气里混着机油和防锈漆的味道。两个守卫坐在折叠桌旁打牌，其中一个的手边搁着一把上了膛的枪。\n'
      + '通风口在货舱左上角，栅格是松的——可惜你不知道换班的间隙有多长。你只有一次机会——',
    choices: [
      { text: '直接冲过去', do: { hp: -5 }, goto: 'starport-win' },
      { text: '绕通风管道（需要情报）', if: 'flags.starportIntel', goto: 'starport-win' },
      { text: '悄悄退回去', goto: 'starport-hub' },
    ],
  },

  'starport-bar': {
    title: '星港 · 红矮星酒吧',
    text: '酒吧里烟雾缭绕，几个赏金猎人趴在吧台上打盹。酒保擦着杯子，收下你的金币，手上的动作没停。\n'
      + '「看你面生。」他压低声音，「货舱守卫换班前有五分钟空档——不多不少，刚够一个人从通风管道爬进去。」\n'
      + '他瞥了眼门口：「还有一句，别碰货舱里的黑箱子。上一个碰的，现在还在港外的垃圾场里漂着。」',
    onEnter: { 'flags.starportIntel': true },
    choices: [
      { text: '返回大厅，前往货舱', goto: 'starport-cargo' },
    ],
  },

  'starport-win': {
    title: '结局 · 数据核心',
    text: '你撬开保险箱，数据核心静静躺在防震盒里，幽蓝的光一下一下地搏动，像某种还在活着的东西。\n'
      + '第七星港的通天秘密，现在归你了——你终于明白中间人为什么不让你打开它看。\n'
      + '雨还在下。你把核心揣进怀里，走向泊位，身后整座星港依旧假装什么都没发生。\n'
      + '（GOOD END）',
    choices: [
      { text: '返回村庄，再玩一次', goto: '@restart' },
    ],
  },
}

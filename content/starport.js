// 示例场景字典（内容包 2）：《星港潜行》DLC
// 演示：多内容包叠加（cordis.yml packs 列表第二个）、跨包跳转、
//       深层状态、消耗型条件、@restart、成就钩子（scene ID 匹配）

export default {
  'starport-hub': {
    title: '星港 · 空港大厅',
    text: '霓虹灯牌在雨幕中闪烁。这里是第七星港——走私者的天堂。你的目标：货舱深处的那枚数据核心。',
    choices: [
      { text: '潜入货舱区', goto: 'starport-cargo' },
      { text: '去「红矮星」酒吧打听', if: 'gold >= 1', do: { gold: -1 }, goto: 'starport-bar' },
      { text: '掉头返回村庄', goto: 'start' },
    ],
  },

  'starport-cargo': {
    title: '星港 · 货舱区',
    text: '货舱里堆满走私箱。两个守卫正在打牌。你只有一次机会——',
    choices: [
      { text: '直接冲过去', do: { hp: -5 }, goto: 'starport-win' },
      { text: '绕通风管道（需要情报）', if: 'flags.starportIntel', goto: 'starport-win' },
      { text: '悄悄退回去', goto: 'starport-hub' },
    ],
  },

  'starport-bar': {
    title: '星港 · 红矮星酒吧',
    text: '酒保收下金币，压低声音：「货舱守卫换班前有五分钟空档，走通风管道。」',
    onEnter: { 'flags.starportIntel': true },
    choices: [
      { text: '返回大厅，前往货舱', goto: 'starport-cargo' },
    ],
  },

  'starport-win': {
    title: '结局 · 数据核心',
    text: '你撬开保险箱，数据核心静静躺在防震盒里。第七星港的通天秘密，现在归你了。\n（GOOD END）',
    choices: [
      { text: '返回村庄，再玩一次', goto: '@restart' },
    ],
  },
}

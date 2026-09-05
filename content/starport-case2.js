// 《港湾连环案》侦探第二案（M5 / Phase 2）
// ⚠️ ESM 模块，加载即执行 —— 只装载可信来源（见 README 安全须知）
//
// 与第一案《星港迷案》独立但共享世界观。入口：starport-hub 追加"第二桩委托"。
// 结构：hub-and-spoke（调查板 = 枢纽），但嫌疑人有 3 人且各有动机，
//       需区分主犯与从犯——指错任何一人都是冤案。
// 谜题：港务官中毒。下毒者是大副（被港务官威胁举报走私），
//       但大副的毒药是医生配的（知情不报），船长知情但袖手（想渔翁得利）。
//       三人都有罪，但下手的是大副。

export default {
  'case2.brief': {
    title: '星港 · 第二桩委托',
    text: '港务官没有死，但他躺在医务室里，嘴唇发紫，呼吸浅得几乎听不见。\n'
      + '副官把你拉到一边：「中毒。昨晚的酒里被人下了东西。船今夜就要离港，港务官醒不过来的话，这桩事就没人查了。」\n'
      + '「嫌疑有三个人——昨晚都和港务官喝过酒：大副、医生、船长。我不管你查到什么，天亮前给我一个名字。」',
    choices: [
      { text: '接下委托', do: { 'flags.case2Accepted': true }, goto: 'case2.board' },
      { text: '不接——一桩就够了', goto: 'starport-hub' },
    ],
  },

  'case2.board': {
    title: '调查板 · 证据 {case2Evidence}/8',
    text: '副官给你腾了张桌子。上面摊着三份口供、一张酒杯的照片、一份毒理报告的草稿。\n'
      + '桌角压着一张纸条：「别信任何一个人的第一句话。」\n'
      + '三个人昨晚都在场，但你已经知道——在场不等于动手。',
    choices: [
      { text: '勘查医务室（港务官的酒杯在这里）', if: '!case2clues.cup', goto: 'case2.scene.medbay' },
      { text: '勘查港务官办公室', if: '!case2clues.office', goto: 'case2.scene.office' },
      { text: '问话：大副', if: '!case2testimony.mate', goto: 'case2.crew.mate' },
      { text: '问话：医生', if: '!case2testimony.medic', goto: 'case2.crew.medic' },
      { text: '问话：船长', if: '!case2testimony.captain', goto: 'case2.crew.captain' },
      { text: '调取昨晚的值更记录', if: '!case2clues.watch', goto: 'case2.archive.watch' },
      { text: '去厨房问那晚倒酒的人', if: '!case2clues.steward && gold >= 3', do: { gold: -3 }, goto: 'case2.steward' },
      { text: '把线索拼一拼', goto: 'case2.deduce' },
      { text: '指认', goto: 'case2.accuse' },
      { text: '搁下，回星港大厅', goto: 'starport-hub' },
    ],
  },

  'case2.scene.medbay': {
    title: '勘查 · 医务室',
    text: '港务官的酒杯还放在床头柜上，没洗。杯口有一圈淡紫色的痕迹——不是酒渍，是某种脂溶性物质干了之后留下的。\n'
      + '毒理草稿上写着：「生物碱类，疑似乌头碱衍生。剂量致死，但投毒者似乎算错了溶解速度——港务官只喝了一半就倒了。」\n'
      + '你注意到一个细节：杯底有细微的刮痕，像是有什么东西在倒酒前被搅过。',
    choices: [
      { text: '记下杯口红痕与底部刮痕，回调查板', do: { 'case2clues.cup': true, case2Evidence: +1 }, goto: 'case2.board' },
      { text: '把毒理草稿也带走', do: { 'case2clues.cup': true, 'case2clues.tox': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.scene.office': {
    title: '勘查 · 港务官办公室',
    text: '办公室被翻过，但翻得很客气——不是找东西，是找人。抽屉半开，文件散了一桌。\n'
      + '你在一堆文件底下找到一封信，是港务官写给大副的，没寄出。信上写：「我已经知道你和冷藏舱那批货的关系。下次出航前，你自己去港务局说清楚，别等我替你说。」\n'
      + '信的背面有大副的笔迹，只写了两个字：「不敢。」',
    choices: [
      { text: '收好信和大副的回批，回调查板', do: { 'case2clues.office': true, 'case2clues.letter': true, case2Evidence: +1 }, goto: 'case2.board' },
      { text: '只记下信的内容', do: { 'case2clues.office': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.archive.watch': {
    title: '档案 · 值更记录',
    text: '值更记录摊开，昨晚的班次一目了然：\n'
      + '大副 20:00–00:00 在岗，00:15 离开驾驶台去过洗手间，00:30 回来。\n'
      + '船长整晚在船长室，"处理文书"。\n'
      + '医生 23:00 去过一次医务室"取药"，10 分钟后回舱。\n'
      + '酒会 23:30 开始，三个人都在。港务官 00:10 倒下。',
    choices: [
      { text: '记下班次与时间线，回调查板', do: { 'case2clues.watch': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.crew.mate': {
    title: '问话 · 大副',
    text: '大副坐在椅子上，手一直在搓裤腿。他说话很快，像怕说慢了就漏掉什么。\n'
      + '「我昨晚确实和他喝酒了，但我没下毒。那封信——是的，我知道那封信。他要我去自首，我不敢，但不至于下毒。」\n'
      + '「你要查毒药，去问医生。他那个医务室什么都有。乌头碱？我连乌头长什么样都不知道。」\n'
      + '他说"乌头碱"三个字时，眼神闪了一下——你怎么知道是乌头碱？毒理草稿还没公开。',
    choices: [
      { text: '追问：你怎么知道是乌头碱', do: { 'case2testimony.mate': true, 'case2clues.slip': true, case2Evidence: +1 }, goto: 'case2.board' },
      { text: '不追问，先记下他的证词', do: { 'case2testimony.mate': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.crew.medic': {
    title: '问话 · 医生',
    text: '医生比上次见面老了不少——或者说，终于装不动年轻了。她给你倒了杯水，手很稳。\n'
      + '「乌头碱是我药柜里的，但钥匙不止我有。大副有备用钥匙，他上个月来取过止痛药，我看见他多看了一眼那个柜子。」\n'
      + '「你要问我昨晚去医务室干什么——取安定。我自己吃的。这事我可以给你看处方。」\n'
      + '她的眼神很平。太平了——平得像提前准备好了每一句话。',
    choices: [
      { text: '问她：你知不知道大副会拿乌头碱', do: { 'case2testimony.medic': true, 'case2clues.medicKnew': true, case2Evidence: +1 }, goto: 'case2.board' },
      { text: '只记下证词', do: { 'case2testimony.medic': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.crew.captain': {
    title: '问话 · 船长',
    text: '船长这次没有穿制服。他穿着一件旧毛衣，桌上的酒杯空了，瓶子里也空了。\n'
      + '「我看着他倒下的。」他说，声音很轻。「酒是厨房倒的，一人一杯。但我注意到一件事——大副把自己的杯子往港务官那边推了一下。」\n'
      + '「我以为他在劝酒。现在想想……我早该反应过来的。」\n'
      + '他没有解释为什么"早该反应过来"却什么都没做。你也没有追问——他的沉默本身就是一种回答。',
    choices: [
      { text: '追问：你为什么没反应', do: { 'case2testimony.captain': true, 'case2clues.captainKnew': true, case2Evidence: +1 }, goto: 'case2.board' },
      { text: '只记下他看到的"推杯子"', do: { 'case2testimony.captain': true, 'case2clues.push': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.steward': {
    title: '走访 · 厨房',
    text: '倒酒的服务生是个十七八岁的男孩，你给的钱让他愿意开口。\n'
      + '「那晚的酒是我倒的，一人一杯，一样多。但——大副把自己的杯子递给了港务官，说"我这杯多了，匀你点"。港务官笑着接了。」\n'
      + '「我当时觉得没什么。现在想想，大副递杯子的时候手在抖。」\n'
      + '男孩犹豫了一下：「还有，我看见医生在酒会前去过厨房——她说来拿冰，但她碰了一下酒瓶。我以为她在试温度。」',
    choices: [
      { text: '记下服务生的证词，回调查板', do: { 'case2clues.steward': true, 'case2clues.push': true, 'case2clues.medicTouched': true, case2Evidence: +1 }, goto: 'case2.board' },
    ],
  },

  'case2.deduce': {
    title: '推理台 · 第二案',
    text: '你把所有东西摊在桌上。这次比上一桩复杂——不是找一个人，是理清三个人之间的关系。\n'
      + '谁下了毒？谁知情不报？三个人都沾了边，但只有一个人真正把杯子推了过去。\n'
      + '谁下的毒？谁知情？谁该为"没阻止"负责？',
    choices: [
      { text: '比对大副的口误与酒杯刮痕', if: 'case2clues.slip && case2clues.cup && !case2flags.linkSlipCup', do: { 'case2flags.linkSlipCup': true, case2Evidence: +1 }, goto: 'case2.deduce' },
      { text: '比对医生的药柜钥匙与服务生证词', if: 'case2clues.medicKnew && case2clues.medicTouched && !case2flags.linkMedicKey', do: { 'case2flags.linkMedicKey': true, case2Evidence: +1 }, goto: 'case2.deduce' },
      { text: '比对船长的沉默与值更记录', if: 'case2clues.captainKnew && case2clues.watch && !case2flags.linkCaptain', do: { 'case2flags.linkCaptain': true, case2Evidence: +1 }, goto: 'case2.deduce' },
      { text: '回调查板', goto: 'case2.board' },
      { text: '够了，去指认', goto: 'case2.accuse' },
    ],
  },

  'case2.accuse': {
    title: '指控 · 第二案',
    text: '副官把三个人叫到一起。港务官还在医务室，嘴唇还是紫的。\n'
      + '「说吧。」副官看着你，「这次不是一个人——你告诉我谁动手，谁知情，谁该担什么。」\n'
      + '（指认大副为下毒者需足够证据。指错或证据不足，都是冤案。）',
    choices: [
      { text: '大副下毒，医生知情配药，船长袖手旁观', if: 'case2Evidence >= 6 && case2clues.slip && case2clues.push', do: { 'flags.case2accused': '大副（主犯）' }, goto: 'case2.ending.truth' },
      { text: '大副下毒（证据不足）', if: '!(case2Evidence >= 6 && case2clues.slip && case2clues.push)', do: { 'flags.case2accused': '大副' }, goto: 'case2.ending.miscarry' },
      { text: '医生下毒——药是她的', do: { 'flags.case2accused': '随船医生' }, goto: 'case2.ending.miscarry' },
      { text: '船长下毒——他想渔翁得利', do: { 'flags.case2accused': '船长' }, goto: 'case2.ending.miscarry' },
      { text: '再想想，回调查板', goto: 'case2.board' },
    ],
  },

  'case2.ending.truth': {
    title: '结局 · 连环案 · 真相',
    text: '你把链条一条条摆出来：服务生看见大副推杯子、大副脱口而出"乌头碱"三个字、医生承认药柜钥匙大副也有、船长承认"早该反应过来"却什么都没做。\n'
      + '大副的手终于不搓裤腿了。他看着地面：「他说要我去自首。我不去。我去了就完了。」\n'
      + '医生闭上眼，没有辩解。船长把空酒瓶转了半圈，没有说话。\n'
      + '副官把三个人分别带走。港务官在天亮前醒了过来——嘴唇还是紫的，但能说话了。他问你的第一句话是：「三个人都抓了？」\n'
      + '你说：「动手的一个没跑。没动手的也没跑掉。」\n'
      + '（TRUE END · 第二案）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'case2.ending.miscarry': {
    title: '结局 · 连环案 · 冤判',
    text: '你指认了{flags.case2accused}，但副官看了你很久，最后摇头：「证据呢？」\n'
      + '你手里有的是口供和推断，没有一条能在法庭上单独成立。三个人互相推诿，你的指认反而成了他们脱身的台阶。\n'
      + '船在天亮后离港。港务官醒来时，甲板上已经没有人可指认了。\n'
      + '（BAD END · 第二案 · 你指错了人，或者指对了但链条没拼完整）',
    choices: [
      { text: '再查一次', goto: '@restart' },
    ],
  },
}

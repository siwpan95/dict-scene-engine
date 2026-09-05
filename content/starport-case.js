// 《星港迷案》侦探 Mod（内容包 2）
// ⚠️ 这是 ESM 模块，加载即执行 —— 只装载可信来源的内容包（见 README 安全须知）
//
// 结构：hub-and-spoke（案卷桌 = 枢纽，每条调查线 = 一个 spoke，查完回枢纽）
// 驱动方式：知识标记 —— 线索写入 clues.* 与 testimony.*，缺失的线索不会显示
//           对应选项；指控时按推理度 suspectLevel 判定成色。
// 入口：星港大厅 starport-hub 的"接下这桩委托"
//
// 谜题设定：死者是货舱管理员，死在货舱。
//   真凶 = 船长（走私被死者察觉而灭口）
//   误导 = 凶器是轮机工具（指向轮机长）、舱里有医生的威胁信（指向医生）
//   关键证据 = 货物清单 / 航行日志 / 欠债传闻

export default {
  // ══════════════ 接案 ══════════════

  'case.brief': {
    title: '星港 · 一桩委托',
    text: '港务官把一只牛皮纸袋推到你面前，里面的照片拍得很糟：一个穿制服的男人倒在货箱之间，后脑有凹陷。\n'
      + '「货舱管理员，昨晚死的。船今晚就要离港，港务局不想担责任，所以我需要一个**外人**来看一眼。」\n'
      + '他盯着你：「结论只有一个要求——得有证据撑得住。你要是随手指一个，坐牢的是你。」',
    choices: [
      { text: '接下委托，先要一份船员名单，回案卷桌', do: { 'flags.caseAccepted': true }, goto: 'case.board' },
      { text: '不接——这不是你能收拾的摊子', goto: 'starport-hub' },
    ],
  },

  // ══════════════ 案卷桌枢纽（可重访） ══════════════

  'case.board': {
    title: '案卷桌 · 推理进度 {suspectLevel}/7',
    text: '港务官给了你一张桌子。你把照片、船员名单和一张星港平面图摊开，中间压着一张便签：\n'
      + '「已掌握线索 {suspectLevel} 条。想清楚再指人。」\n'
      + '桌子很窄，但你心里清楚——每一条没查过的线，都可能藏着翻案的东西。',
    choices: [
      { text: '去码头现场看看', if: '!clues.dock', goto: 'scene.dock' },
      { text: '进入死者舱室', if: '!clues.cabin', goto: 'scene.cabin' },
      { text: '再进一次货舱（需权限）', if: 'flags.cargoAccess && !clues.cargo', goto: 'scene.cargo' },
      { text: '问话：船长', if: '!testimony.captain', goto: 'crew.captain' },
      { text: '问话：轮机长', if: '!testimony.engineer', goto: 'crew.engineer' },
      { text: '问话：随船医生', if: '!testimony.medic', goto: 'crew.medic' },
      { text: '调阅航行日志', if: '!clues.log', goto: 'archive.log' },
      { text: '调阅货物清单', if: '!clues.manifest', goto: 'archive.manifest' },
      { text: '去「红矮星」酒吧听风声（2 金币）', if: '!clues.rumor && gold >= 2', do: { gold: -2 }, goto: 'district.bar' },
      { text: '去黑市打探凶器（10 金币）', if: '!clues.weapon && gold >= 10', do: { gold: -10 }, goto: 'district.market' },
      { text: '坐下来，把线索摊开拼一拼', goto: 'case.deduce' },
      { text: '我已经想清楚了——指认凶手', goto: 'case.accuse' },
      { text: '把案子搁下，回星港大厅', goto: 'starport-hub' },
    ],
  },

  // ══════════════ 现场勘察 ══════════════

  'scene.dock': {
    title: '勘察 · 码头',
    text: '码头的积水里浮着一层油花。死者倒下的位置旁边，有一道拖痕——从货舱口一直拖到栈桥边缘，中途被水冲断。\n'
      + '拖痕边上散落着几粒的东西，蹲下才看清：是干燥的海藻粉，星港只有冷藏舱会用。而名单上，冷藏舱的货主栏是空的。\n'
      + '你站起身时，瞥见栈桥尽头有人在抽烟，一直看着你。',
    choices: [
      { text: '记下拖痕与海藻粉，回案卷桌', do: { 'clues.dock': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '追上那个抽烟的人问问，回案卷桌', do: { 'clues.dock': true, suspectLevel: +1, 'flags.cargoAccess': true }, goto: 'case.board' },
    ],
  },

  'scene.cabin': {
    title: '勘察 · 死者舱室',
    text: '舱室很窄，床铺整齐得不像有人住过——像是有人先收拾过一遍。枕头底下压着半封信，收信人就是死者，落款只有一个字母 M。\n'
      + '信上写着：「你再查那批货，我就把你的体检报告公开。」随船医生的姓氏，首字母正是 M。\n'
      + '抽屉里还有一枚货舱的备用钥匙，不在死者身上——说明有人拿走了它，或者死者把它藏了起来。',
    choices: [
      { text: '收好信，记下这枚备用钥匙，回案卷桌', do: { 'clues.cabin': true, suspectLevel: +1, 'flags.cargoAccess': true }, goto: 'case.board' },
      { text: '只记下信，钥匙留在原处，回案卷桌', do: { 'clues.cabin': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  'scene.cargo': {
    title: '勘察 · 货舱',
    text: '货舱里还留着警戒线。死者倒下的地方画着白线，线外摆着一只扳手——尺寸明显是轮机舱用的，柄上没有血，只有油。\n'
      + '你对着清单数了数货箱：编号 12 到 19 是连号的，可 15 号的封条是新的，边缘还留着撕掉旧封条的胶痕。\n'
      + '15 号箱很轻。轻得不像装了货。',
    choices: [
      { text: '撬开 15 号箱看个究竟，回案卷桌', do: { 'clues.cargo': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '只记下扳手与封条的异常，不动货，回案卷桌', do: { 'clues.cargo': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  // ══════════════ 询问船员 ══════════════

  'crew.captain': {
    title: '问话 · 船长',
    text: '船长在船长室里，制服笔挺，桌上摆着一杯没动过的酒。他听完你的问题，沉默了很久才开口。\n'
      + '「那批货是冷藏舱的，不归我管。死者什么时候进的货舱，我也不知道——我十一点就睡了。」\n'
      + '他说得很稳，稳得像提前排练过。你注意到他手边的抽屉没关严，里面露出一角纸——颜色和货物清单一样。',
    choices: [
      { text: '追问：抽屉里的那张纸是什么，回案卷桌', do: { 'testimony.captain': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '不惊动他，先记下这份"过于平稳"的证词，回案卷桌', do: { 'testimony.captain': true, suspectLevel: +1, 'flags.cargoAccess': true }, goto: 'case.board' },
    ],
  },

  'crew.engineer': {
    title: '问话 · 轮机长',
    text: '轮机长满手油污，蹲在机器旁不肯起来。「扳手是我的，丢了一周了，报过备。」他说得很干脆。\n'
      + '「那晚上我在机舱，噪音大得听不见别的——你要不信，去看主机的运行记录，十一点到两点，转速是稳定的。」\n'
      + '他抬头看你一眼：「不过我劝你别太较真。上一个较真的，是死者。」',
    choices: [
      { text: '记下他的不在场证明与那句警告，回案卷桌', do: { 'testimony.engineer': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '问他：死者最近在查什么，回案卷桌', do: { 'testimony.engineer': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  'crew.medic': {
    title: '问话 · 随船医生',
    text: '医生很年轻，手指一直绞着白大褂的边。你还没开口，她就先说了：「那封信不是威胁，是求他闭嘴。」\n'
      + '「他的体检报告——肝硬化晚期。是我帮他瞒下来的，按规矩他根本不该上船。我怕他出事连累我，所以写了那封信。」\n'
      + '她说着说着声音低下去：「他这人轴得很，明明快死了，还非要查清楚那批货。」',
    choices: [
      { text: '追问：他查那批货查到什么了，回案卷桌', do: { 'testimony.medic': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '记下这些，先不动声色，回案卷桌', do: { 'testimony.medic': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  // ══════════════ 查阅档案 ══════════════

  'archive.log': {
    title: '档案 · 航行日志',
    text: '航行日志摊在桌上，纸页边缘有被橡皮擦过的毛边。昨夜十一点到两点这一段，字迹比前后的都新——墨色还没吃透纸。\n'
      + '记录写着「航向正常，货舱封闭」。可轮机长说的主机运行记录，和这一栏的时间对不上差了十七分钟。\n'
      + '能改航行日志的人，全船只有两个：船长，和大副。而大副三个月前就下船了。',
    choices: [
      { text: '比对时间差，把这一页誊下来，回案卷桌', do: { 'clues.log': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '记下墨色与毛边，回案卷桌', do: { 'clues.log': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  'archive.manifest': {
    title: '档案 · 货物清单',
    text: '清单最后一页被人撕过。冷藏舱那一栏写着"医药品，四百箱"，可底下的重量合计栏，数字比四百箱的常规重量少了近三分之一。\n'
      + '更怪的是签字：船长签在"实收"栏，日期是昨天——而死者的签收栏是空的。\n'
      + '也就是说，船长在死者还没验货之前，就已经替他签了。',
    choices: [
      { text: '抄下重量差与那处提前的签字，回案卷桌', do: { 'clues.manifest': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '照着清单去货舱核实物，回案卷桌', do: { 'clues.manifest': true, suspectLevel: +1, 'flags.cargoAccess': true }, goto: 'case.board' },
    ],
  },

  // ══════════════ 走访港内 ══════════════

  'district.bar': {
    title: '走访 · 红矮星酒吧',
    text: '酒保收下你的钱，压低声音：「船长的债，港里一半人都知道——他挪了公司的货款去补仓，这个航次回不去就得进监狱。」\n'
      + '「冷藏舱那批货？别问了。上周有人出钱让我别记那个箱号，出的价比我一年的酒钱还多。」\n'
      + '他擦着杯子补了一句：「不过啊，动手打人是一回事，改账是另一回事。改账的人，得有钥匙，还得有权限。」',
    choices: [
      { text: '记下欠债与"别记箱号"的事，回案卷桌', do: { 'clues.rumor': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '追问：出钱的是谁，回案卷桌', do: { 'clues.rumor': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  'district.market': {
    title: '走访 · 黑市',
    text: '黑市藏在废弃泊位下，摊主是个缺了半只耳朵的老头。你把钱放在台上，他才从脚边拖出一只铁盒。\n'
      + '「这种轮机扳手？上周有人来问过，要一模一样的，说是配工具箱。」他翻开登记本，指给你看一行潦草的字。\n'
      + '签名栏写着 two——这是星港黑话，意思是"二副"。可这艘船的名单上没有二副。',
    choices: [
      { text: '记下这条购买记录，回案卷桌', do: { 'clues.weapon': true, suspectLevel: +1 }, goto: 'case.board' },
      { text: '把扳手的来路问清楚再走，回案卷桌', do: { 'clues.weapon': true, suspectLevel: +1 }, goto: 'case.board' },
    ],
  },

  // ══════════════ 推理与指控 ══════════════

  'case.deduce': {
    title: '推理台 · 拼合',
    text: '你把摊开的东西两两对着看。单看每一条都只是疑点，凑到一起才像话——\n'
      + '问题是，还差哪一块？',
    choices: [
      // 线索组合：把两条证据对上，才看得出因果。每条组合给一次推理度，且不能重复拿
      { text: '比对货物清单与航行日志', if: 'clues.manifest && clues.log && !flags.linkManifestLog', do: { 'flags.linkManifestLog': true, suspectLevel: +1 }, goto: 'case.deduce' },
      { text: '比对凶器来路与船长的债', if: 'clues.weapon && clues.rumor && !flags.linkWeaponRumor', do: { 'flags.linkWeaponRumor': true, suspectLevel: +1 }, goto: 'case.deduce' },
      { text: '比对三条证词之间的空档', if: 'testimony.captain && testimony.engineer && testimony.medic && !flags.linkTestimony', do: { 'flags.linkTestimony': true, suspectLevel: +1 }, goto: 'case.deduce' },
      { text: '核对现场痕迹与货舱封条', if: 'clues.dock && clues.cargo && !flags.linkScene', do: { 'flags.linkScene': true, suspectLevel: +1 }, goto: 'case.deduce' },
      { text: '核对舱室那封信与医生的处境', if: 'clues.cabin && testimony.medic && !flags.linkLetter', do: { 'flags.linkLetter': true, suspectLevel: +1 }, goto: 'case.deduce' },
      { text: '回案卷桌，还有没查的', goto: 'case.board' },
      { text: '够了，去指认', goto: 'case.accuse' },
    ],
  },

  'case.accuse': {
    title: '指控',
    text: '港务官把三个人都叫到了大厅。船长依旧笔挺，轮机长抱着胳膊，医生低着头。\n'
      + '「说吧。」港务官看着你，「说错一次，这案子就结了——以后也不会再有人查。」\n'
      + '（定船长的罪需要：足够多的线索 + 清单与日志这两件硬证据。缺一样，他都会走出去。）',
    choices: [
      { text: '指认船长，摆出清单、日志与欠债', if: 'suspectLevel >= 5 && clues.manifest && clues.log', do: { 'flags.accused': '船长' }, goto: 'ending.truth' },
      { text: '指认船长（手上还撑不住）', if: '!(suspectLevel >= 5 && clues.manifest && clues.log)', do: { 'flags.accused': '船长' }, goto: 'ending.miscarry' },
      { text: '指认轮机长——凶器是他的扳手', do: { 'flags.accused': '轮机长' }, goto: 'ending.miscarry' },
      { text: '指认医生——她写过威胁信', do: { 'flags.accused': '随船医生' }, goto: 'ending.miscarry' },
      { text: '再想想，回案卷桌', goto: 'case.board' },
    ],
  },

  // ══════════════ 结局 ══════════════

  'ending.truth': {
    title: '结局 · 真凶归案',
    text: '你一样样摊开：清单上提前签下的名字、被擦改过的航行日志、黑市里那个不存在的"二副"、以及船长的债。\n'
      + '船长的手终于离开了酒杯。他没有辩解，只问了一句：「他都要死了，为什么不能闭嘴？」\n'
      + '——「因为他查的是货，不是你。」你说。\n'
      + '冷藏舱被打开时，四百箱医药品里混着三百箱别的东西。案子结了，医生的体检报告也随卷宗封存，没人再提。\n'
      + '（TRUE END）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'ending.miscarry': {
    title: '结局 · 冤案',
    text: '你说完了，大厅里没人说话。港务官看了你很久，最后把笔一搁：「证据呢？」\n'
      + '你张了张嘴，发现自己能拿出来的，只有一只扳手、一封信，和几句传闻。它们能把人送进拘留室，却送不进法庭。\n'
      + '你指认了{flags.accused}。三天后，船照常离港。扳手被没收，那封信进了卷宗，这些名字再没人提起——包括真正该被提起的那个。\n'
      + '（BAD END · 你指错了人，或者指对了却拿不出证据）',
    choices: [
      { text: '再查一次', goto: '@restart' },
    ],
  },
}

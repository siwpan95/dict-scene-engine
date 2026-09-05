// 《古堡寻剑》主线深化包（M4 / Phase 2）
// ⚠️ ESM 模块，加载即执行 —— 只装载可信来源（见 README 安全须知）
//
// 接入点：castle.dungeon.after 新增"下地下层"选项；castle.sanctum 新增 NPC 互动。
// 新增内容：地下层 5 场景 + NPC 4 场景 + 2 新结局 + 过渡 = 约 15 场景
// 新结局：ending.tyrant（僭主，拿走剑的力量统治古堡）、ending.sacrifice（献祭，以自身封印断剑）
//
// 覆盖关系：本包覆盖 castle.dungeon.after 与 castle.sanctum（在同 ID 场景上追加选项），
// 其余为新增场景。cordis.yml packs 顺序：demo.js → starport.js → starport-case.js → 本包

export default {
  // ══════════════ 覆盖：地牢胜利后追加"下地下层" ══════════════

  'castle.dungeon.after': {
    title: '地牢 · 阶梯口',
    text: '守卫倒下了，身体像撒了气的皮囊一样瘪下去，最后只剩一层灰。\n'
      + '你从它身上搜出几枚古旧的金币，还有一块铁牌——牌上刻着"圣所守夜人"，背面是编号，编号已经被磨得只剩两道横。\n'
      + '阶梯尽头的光还在，上面就是圣所。但你注意到阶梯旁还有一条更窄的缝，通往更深处——地下层。空气从那里涌上来，带着一股陈年的霉味和某种说不清的甜。',
    choices: [
      { text: '登上圣所', goto: 'castle.sanctum' },
      { text: '先回大厅喘口气', goto: 'castle.hall' },
      { text: '钻进那条窄缝，下地下层看看', if: '!flags.underworldVisited', do: { 'flags.underworldVisited': true }, goto: 'castle.underworld.entry' },
    ],
  },

  // ══════════════ 地下层 ══════════════

  'castle.underworld.entry': {
    title: '地下层 · 裂缝',
    text: '缝隙越走越宽，最后变成一条真正的甬道。墙壁上渗着水，水滴落在地上发出有节奏的声响，像某种古老的计时。\n'
      + '甬道尽头是一扇没有锁的铁门，门上刻着一行字，字迹古旧但能辨认：「入者自负。」\n'
      + '门后传来两种声音：一种是金属碰撞的脆响，从左边来；一种是低低的自语，从右边来。两种声音都不像活人发出的。',
    choices: [
      { text: '推门进去，往左走（金属声）', goto: 'castle.underworld.alchemist' },
      { text: '推门进去，往右走（自语声）', goto: 'castle.underworld.ghost' },
      { text: '不下去，回阶梯口', goto: 'castle.dungeon.after' },
    ],
  },

  'castle.underworld.alchemist': {
    title: '地下层 · 炼金室',
    text: '左边的房间是一间炼金室。瓶瓶罐罐碎了一地，只有角落里一口坩埚还在自己烧着，火是绿色的，没有柴。\n'
      + '坩埚旁坐着一具骷髅，骷髅的手指还夹着一根搅拌棒，棒头早已烧化。你走近时，骷髅的下颌骨突然动了——\n'
      + '「又一个来拿剑的？」声音从骨头缝里挤出来，干涩得像砂纸。「坐。我给你讲个故事，比你从那本破手记里读到的完整。」',
    choices: [
      { text: '坐下听他说', if: '!flags.alchemistHeard', do: { 'flags.alchemistHeard': true, 'flags.swordLore': true }, goto: 'castle.underworld.alchemist.tale' },
      { text: '已经知道真相了，问他有没有能用的东西', if: 'flags.alchemistHeard', goto: 'castle.underworld.alchemist.trade' },
      { text: '不跟死人啰嗦，看看坩埚里有什么', do: { hp: -5, 'items.underworld_ash': +1 }, goto: 'castle.underworld.alchemist.burn' },
      { text: '离开炼金室', goto: 'castle.underworld.entry' },
    ],
  },

  'castle.underworld.alchemist.tale': {
    title: '炼金室 · 骷髅的故事',
    text: '骷髅讲得很慢，每句话之间都要等下颌骨归位。\n'
      + '「剑不是被劈成两半的，是自己断的。它认了一个不值得认的主人，那人拿着它做了不该做的事，剑就断了——宁可断，也不肯再被那样用。」\n'
      + '「后来有人想把它拼回去。拼回去不难，难的是拼回去之后，它还认不认人。你从手记里读到的是一半——另一半是：拼回去的剑，可能比断着的时候更危险。」\n'
      + '「我叫什么不重要。我以前也想拼它。你看我现在。」',
    choices: [
      { text: '问他：怎样拼回去才安全', do: { 'flags.swordLore': true, 'flags.safeMerge': true }, goto: 'castle.underworld.alchemist.trade' },
      { text: '谢过他，离开炼金室', goto: 'castle.underworld.entry' },
    ],
  },

  'castle.underworld.alchemist.trade': {
    title: '炼金室 · 交易',
    text: '骷髅的空洞眼眶对着你。「能用的东西？我这儿只剩灰了。」他用搅拌棒指了指地上的一堆瓶渣。\n'
      + '「不过你要是真心想拿那柄剑，我劝你带一样东西上去——」他从肋骨缝里掏出一只小瓶，里面的液体发着微光，「这是我最后一瓶稳心剂。剑认主的时候会试探你的心，心不稳的人，会被它反噬。」\n'
      + '「白送。我留着也没用了。」',
    choices: [
      { text: '收下稳心剂', if: '!items.calm_potion', do: { 'items.calm_potion': +1, 'flags.safeMerge': true }, goto: 'castle.underworld.alchemist' },
      { text: '不收——你不需要死人的药', goto: 'castle.underworld.alchemist' },
    ],
  },

  'castle.underworld.alchemist.burn': {
    title: '炼金室 · 坩埚',
    text: '你伸手去探坩埚，绿火猛地窜了一下，灼了你的手。\n'
      + '你缩回手，指尖沾了一点灰色的粉末——闻着像某种金属氧化物，入鼻发凉。骷髅在身后干笑了一声：「贪心的。那灰是剑断时溅出来的，碰了伤身，但带着它上去，石像鬼会迟疑一会儿。」\n'
      + '你把灰收进怀里。手还在疼。',
    choices: [
      { text: '回炼金室', goto: 'castle.underworld.alchemist' },
    ],
  },

  'castle.underworld.ghost': {
    title: '地下层 · 管家室',
    text: '右边的房间陈设整齐得不像地下室——桌椅擦得发亮，壁炉里没有火，却摆着一束干花，花是新鲜的。\n'
      + '一个穿管家服的半透明人影站在桌后，正在擦一只永远擦不干净的银杯。他抬起头看你，表情客气而疲惫：「客人。很久没有客人了。」\n'
      + '「我是这里的管家。上一任管家。上上一任也是。我们都在等一个能把事情了结的人。」',
    choices: [
      { text: '问他：什么事情需要了结', if: '!flags.ghostHeard', do: { 'flags.ghostHeard': true }, goto: 'castle.underworld.ghost.duty' },
      { text: '问他：你是怎么死的', do: { 'flags.ghostCause': true }, goto: 'castle.underworld.ghost.death' },
      { text: '亮出你的武器，问他认不认得', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', do: { 'flags.ghostSword': true }, goto: 'castle.underworld.ghost.sword' },
      { text: '离开管家室', goto: 'castle.underworld.entry' },
    ],
  },

  'castle.underworld.ghost.duty': {
    title: '管家室 · 了结',
    text: '管家放下银杯，声音像叹息。\n'
      + '「了结，就是把剑的事做个收尾。它断了太久了——断着的时候，它一直在漏，漏出去的东西让堡里的一切都变了味。石像鬼变凶了，守卫失了神，连花都开不对季节。」\n'
      + '「上去的人要么想拼它，要么想拿它，要么想卖它。没有人想过——也许该把它**封了**。让它别再漏，别再等人。」\n'
      + '他看着你，半透明的脸上有一丝不易察觉的恳求。',
    choices: [
      { text: '记下"封剑"这个选项', do: { 'flags.knowSeal': true }, goto: 'castle.underworld.ghost' },
      { text: '问他怎么封', if: 'flags.knowSeal', do: { 'flags.knowSealMethod': true }, goto: 'castle.underworld.ghost.seal' },
      { text: '回管家室', goto: 'castle.underworld.ghost' },
    ],
  },

  'castle.underworld.ghost.seal': {
    title: '管家室 · 封剑之法',
    text: '管家沉默了一会儿，然后从怀里取出一把钥匙——不是普通的钥匙，是半透明的，和他的手一样。\n'
      + '「封剑需要两样东西：一是剑的另一半，就在圣所的石台上。二是封印者自己的命——不是死，是**留**。留下来，守着它，让它别再等人。」\n'
      + '「我守了一百二十年，该走了。如果你选择封，这把钥匙就是你的。它能打开石台下的封印槽。」\n'
      + '他把钥匙放在桌上，手在发抖——不是害怕，是期待。',
    choices: [
      { text: '接过钥匙', if: '!items.seal_key', do: { 'items.seal_key': +1, 'flags.knowSealMethod': true }, goto: 'castle.underworld.ghost' },
      { text: '不接——你不想留在这里', goto: 'castle.underworld.ghost' },
    ],
  },

  'castle.underworld.ghost.death': {
    title: '管家室 · 管家的死',
    text: '管家的手停了一下。\n'
      + '「我?我没死。或者说，死了但没走。」他低头看看自己半透明的身体，「上一个想拼剑的人，拼到一半被反噬了。剑漏出来的东西冲进大厅，我正好在擦花瓶。」\n'
      + '「之后就再也没能离开这个房间。不是走不了——是走了，堡里的东西就没人管了。花会枯，银杯会黑，石像鬼会彻底失控。」\n'
      + '他苦笑了一下：「管家就是管家。死活都得在岗。」',
    choices: [
      { text: '回管家室', goto: 'castle.underworld.ghost' },
    ],
  },

  'castle.underworld.ghost.sword': {
    title: '管家室 · 辨剑',
    text: '管家看到你手里的武器，半透明的身体闪了一下，像信号不好的电视。\n'
      + '「这不是那柄剑。」他很快说，「是仿品——仿得不错，但不是。那柄剑的剑身上有七道纹，你的只有六道。」\n'
      + '「不过仿品也能让石像放你过去。它认的不是真假，是**持有者的意图**。你拿着它进去，是去拿，还是去还，还是去封——它都看得见。」\n'
      + '他顿了顿：「 Intentions matter more than authenticity here.」（意图比真伪更重要。）',
    choices: [
      { text: '记下这一点', do: { 'flags.ghostSword': true }, goto: 'castle.underworld.ghost' },
    ],
  },

  // ══════════════ 覆盖：圣所追加 NPC 线索与新结局选项 ══════════════

  'castle.sanctum': {
    title: '古堡 · 圣所',
    text: '圣所是整座古堡最高的房间，四面无墙，只有一圈石柱撑着穹顶——从这里能看见整片北山。\n'
      + '正中是一座三尺高的石台，台上插着半截断剑，断口朝上，和你手里那把正好对得上。石台旁蹲着石像鬼，和门洞上那尊一模一样，只是这只会呼吸。\n'
      + '它睁开眼，暗红色的光落在你身上，没有立刻动手——它在等你自己决定。\n'
      + '石台底座上有一道窄缝，像是某种锁孔。地面的石砖上刻着一圈古文，围成一个圆环。',
    choices: [
      { text: '把断剑放回石台，让它们合二为一（需知道真相）', if: 'flags.swordLore && items.broken_sword >= 1', goto: 'ending.sword' },
      { text: '举起你的剑——石像认剑不认人', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', goto: 'ending-win' },
      { text: '举起回廊里得来的银匕首——石像认得堡中的旧物', if: 'items.silver_dagger >= 1', goto: 'ending-win' },
      { text: '拔下石台上那半截，与石像鬼一战', goto: 'castle.sanctum.battle' },
      { text: '悄悄退回去，把这里的一切卖个好价钱（需持剑）', if: 'items.rusty_sword >= 1 || items.broken_sword >= 1', goto: 'ending.merc' },
      // M4 新增
      { text: '拔下石台上的断剑，宣称自己为新主——不拼合，直接夺取', if: 'items.broken_sword >= 1', goto: 'ending.tyrant' },
      { text: '把断剑放回石台，将封印钥匙插入底座（需钥匙）', if: 'items.seal_key && items.broken_sword >= 1', goto: 'ending.sacrifice' },
      { text: '把断剑和地下层的灰一起撒入石台缝隙', if: 'items.underworld_ash >= 1 && items.broken_sword >= 1', do: { 'flags.ashOffered': true }, goto: 'castle.sanctum.ash' },
    ],
  },

  'castle.sanctum.ash': {
    title: '圣所 · 灰与剑',
    text: '你把灰色的粉末撒入石台缝隙，又把断剑放了上去。\n'
      + '粉末接触到缝隙的瞬间，发出一声极轻的嘶响——石像鬼猛地站了起来，暗红色的眼里闪过一丝……你不确定那是什么。惊讶？恐惧？\n'
      + '它没有攻击。它退后了一步，像是在重新打量你。\n'
      + '断剑没有合拢——灰让两半之间产生了一层薄膜，阻断了认主反应。剑安静了，不再漏出那种让堡里一切变味的东西。',
    choices: [
      { text: '趁剑安静，转身离开古堡——你封不住它，但至少让它歇一会儿', goto: 'ending.merc' },
      { text: '还是试试拼合（灰可能干扰认主）', if: 'flags.swordLore', goto: 'ending.sword' },
      { text: '用封印钥匙完成封印', if: 'items.seal_key', goto: 'ending.sacrifice' },
    ],
  },

  // ══════════════ 新结局 ══════════════

  'ending.tyrant': {
    title: '结局 · 僭主',
    text: '你拔下了石台上的断剑。石像鬼没有拦你——它看见了你的意图，而它的职责只是看着。\n'
      + '两截断剑在你手里没有合拢。它们各自安静，像两把普通的铁。\n'
      + '但你不需要它们合拢。你拿着两截断剑走出了古堡，身后，石像鬼的呼吸声渐渐停了，堡里的火把一盏盏灭掉——它在关灯。\n'
      + '三个月后，北山多了一个新主人。没有人知道你的名字，但所有人都听说过那两截从不合拢的断剑——和拿着它们的人从不解释的态度。\n'
      + '（NEUTRAL END · 僭主结局：你拿走了剑，但剑没有认你。古堡不再漏了，但也不再护着任何人。）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },

  'ending.sacrifice': {
    title: '结局 · 献祭',
    text: '你把断剑放回石台，将半透明的钥匙插入底座的缝隙。钥匙没入的瞬间，变成和管家一样的半透明。\n'
      + '石台上的两截断剑缓缓靠拢，但没有合二为一——它们被一层看不见的东西裹住了，像琥珀里的虫。\n'
      + '石像鬼的暗红色眼睛彻底暗了下去。它坐回原位，重新变成一尊不会呼吸的石头。\n'
      + '你转身时，看见管家站在门口。他对你鞠了一躬，然后——散了。像一缕被风吹散的烟。\n'
      + '你走下古堡的台阶。风很凉。你知道剑不会再漏了，也不会再等人了。堡里的花会按季节开了。\n'
      + '你不再是你了——一部分留在了那里，守着封印。但剩下的部分，够你走回村里，喝一碗热酒。\n'
      + '（TRUE END · 献祭结局：你选择了封印而非夺取。古堡终于安静了。）',
    choices: [
      { text: '再玩一次', goto: '@restart' },
    ],
  },
}

/**
 * Katie Clarke 语录库 —— 精选自访谈《How to Create a Frequency So Magnetic
 * Your Desires Chase You》（中英对照转录）。
 *
 * 中文是对转录口语的润色（保持原意、去掉访谈语境），英文是访谈原句（轻度裁剪）。
 * 五个主题：阴影工作 / 接纳 / 频率与显化 / 信念 / 临在与力量。
 */
export type QuoteTheme = 'shadow' | 'acceptance' | 'frequency' | 'belief' | 'presence';

export interface Quote {
  id: string;
  zh: string;
  en: string;
  theme: QuoteTheme;
}

export const QUOTES: Quote[] = [
  // ——— 阴影工作 ———
  {
    id: 'q01',
    zh: '阴影工作，就是把潜意识变成意识的过程。',
    en: 'Shadow work is essentially the process of making the unconscious conscious.',
    theme: 'shadow',
  },
  {
    id: 'q02',
    zh: '「我不够好」从来都不是真的，那只是你当时的感知。',
    en: 'It was never actually true. It was just your perception at the time.',
    theme: 'shadow',
  },
  {
    id: 'q03',
    zh: '这些伤是可以被疗愈的，它不必定义你的一生。',
    en: "You can heal this stuff. It doesn't have to define you for your whole life.",
    theme: 'shadow',
  },
  {
    id: 'q04',
    zh: '在直面并整合阴影之后，另一端有着极大的自由。',
    en: "There's a lot of freedom on the other side of facing and integrating this stuff.",
    theme: 'shadow',
  },
  {
    id: 'q05',
    zh: '真正看向自己，需要的只是勇气、谦卑与诚实。',
    en: 'It just takes courage and the humility and honesty to really look at yourself.',
    theme: 'shadow',
  },
  {
    id: 'q06',
    zh: '直面自己，也许是你此生最难拿出的勇气。',
    en: "It's probably the hardest courage you'll ever have, facing yourself.",
    theme: 'shadow',
  },
  {
    id: 'q07',
    zh: '对心里的它说：我在你身边，我爱你，我看见你。',
    en: "You say to them: I'm here for you. I love you. I see you.",
    theme: 'shadow',
  },
  {
    id: 'q08',
    zh: '我再也不会丢下你了。对不起，曾把你推进黑暗。',
    en: "I'm never going to leave you alone again. I'm sorry I pushed you in the dark.",
    theme: 'shadow',
  },
  {
    id: 'q09',
    zh: '那个部分也是你的一部分，它需要一个新的角色。',
    en: 'That part of you is a part of you, and they need a role.',
    theme: 'shadow',
  },
  {
    id: 'q10',
    zh: '你的力量，就藏在那些相信自己没有力量的部分里。',
    en: "Your power is found in facing all the parts of you that believe you don't have power.",
    theme: 'shadow',
  },
  {
    id: 'q11',
    zh: '你所做的一切都不是随机的，每个行为背后都有一个信念。',
    en: 'Nothing you do is random. Every behavior that you have is driven by a belief or a part of you.',
    theme: 'shadow',
  },

  // ——— 接纳 ———
  {
    id: 'q12',
    zh: '无论涌上来的是什么，对它说三遍：没关系。',
    en: "Whatever it is that's coming up, just say three times: It's okay. It's okay. It's okay.",
    theme: 'acceptance',
  },
  {
    id: 'q13',
    zh: '评判与理解，无法同时存在。',
    en: "You can't be in judgment and understanding at the same time.",
    theme: 'acceptance',
  },
  {
    id: 'q14',
    zh: '你抗拒它、评判它，就永远无法理解它。',
    en: "If you're resisting something, if you're judging something, you will never understand it.",
    theme: 'acceptance',
  },
  {
    id: 'q15',
    zh: '接纳它，不代表这件事没问题，而是释放的开始。',
    en: "It doesn't mean it's okay. It means you're actually going to start the process of releasing it.",
    theme: 'acceptance',
  },
  {
    id: 'q16',
    zh: '允许自己去感受，情绪才能完成循环、离开身体。',
    en: 'When you let yourself feel it, the energy cycle can complete and it can start to leave your body.',
    theme: 'acceptance',
  },
  {
    id: 'q17',
    zh: '直面自己，从承认「我现在不好受」开始。',
    en: "Facing these parts of yourself, it starts with admitting that you don't feel good.",
    theme: 'acceptance',
  },
  {
    id: 'q18',
    zh: '不评判，只是温柔地陪着——做自己慈悲的观察者。',
    en: "This is the key energy you want to be in: you're in the compassionate observer.",
    theme: 'acceptance',
  },
  {
    id: 'q19',
    zh: '疗愈是一段旅程，一段不断回到真实自我的旅程。',
    en: 'Healing is an ongoing journey of coming back into your true self.',
    theme: 'acceptance',
  },
  {
    id: 'q20',
    zh: '深挖「我不够好」的理由，你会发现它毫无依据。',
    en: "When you dig into the reasons why you don't feel good enough, you start to realize there's really no basis for it.",
    theme: 'acceptance',
  },
  {
    id: 'q21',
    zh: '没有人生来羞愧；我们本来完整，本来就足够好。',
    en: "None of us were born ashamed. We're all inherently whole. We're all inherently good enough.",
    theme: 'acceptance',
  },

  // ——— 频率与显化 ———
  {
    id: 'q22',
    zh: '你的频率，就是你这个人的总和。',
    en: 'Your frequency is the sum total of you.',
    theme: 'frequency',
  },
  {
    id: 'q23',
    zh: '你的信念、情绪与思想，共同构成你的能量频率。',
    en: 'The primary shareholders of your frequency are your emotions, your thoughts, your beliefs.',
    theme: 'frequency',
  },
  {
    id: 'q24',
    zh: '别再把眼下的处境，当成最终的定论。',
    en: 'You have to stop taking your circumstances as definitive.',
    theme: 'frequency',
  },
  {
    id: 'q25',
    zh: '你远远大于你的处境。',
    en: 'You are so much bigger than your circumstances.',
    theme: 'frequency',
  },
  {
    id: 'q26',
    zh: '过去不必等于未来；除非你允许，它定义不了你。',
    en: 'The past does not have to be the future. It does not define you unless you say it does.',
    theme: 'frequency',
  },
  {
    id: 'q27',
    zh: '我们显化，就像呼吸一样，从不停歇。',
    en: "We manifest like we breathe air. We can't help it.",
    theme: 'frequency',
  },
  {
    id: 'q28',
    zh: '创造的次序：先成为，再行动，后拥有。',
    en: 'The order of creation, if we break it down simply, is be, do, have.',
    theme: 'frequency',
  },
  {
    id: 'q29',
    zh: '显化，是先在内在得到，再看它映照于外。',
    en: 'Manifestation is about getting something internally so that you can see it reflected externally.',
    theme: 'frequency',
  },
  {
    id: 'q30',
    zh: '你所感知的世界，是你能量状态的镜像。',
    en: "What you're perceiving is just a mirror reflection of the state of your energy.",
    theme: 'frequency',
  },
  {
    id: 'q31',
    zh: '先成为你想拥有的：成为爱，成为喜悦。',
    en: 'Be that way first. Be the love you want to be. Be positivity. Be joy.',
    theme: 'frequency',
  },
  {
    id: 'q32',
    zh: '通往新现实的门票，是现在就成为那个版本的你。',
    en: 'Your ticket to that version of reality is becoming that version of you now.',
    theme: 'frequency',
  },
  {
    id: 'q33',
    zh: '要么你定义处境，要么处境定义你。',
    en: 'You are either defining your circumstances or your circumstances are defining you.',
    theme: 'frequency',
  },
  {
    id: 'q34',
    zh: '不断进化，就是不断放下旧的自己。',
    en: "A person who's constantly evolving is constantly letting go of parts of the old self.",
    theme: 'frequency',
  },

  // ——— 信念 ———
  {
    id: 'q35',
    zh: '信念，是一个被情感确信支撑的念头。',
    en: 'A belief is a thought backed by emotional conviction.',
    theme: 'belief',
  },
  {
    id: 'q36',
    zh: '挑一个你真能相信的新信念，哪怕只信一点点。',
    en: 'You pick a belief you can believe in. Even just a little bit.',
    theme: 'belief',
  },
  {
    id: 'q37',
    zh: '选那句触手可及、却比旧信念更有力量的话。',
    en: "Pick the lowest hanging fruit belief that's more empowering than your old one.",
    theme: 'belief',
  },
  {
    id: 'q38',
    zh: '要放下旧信念，就给它一个完全相反的新信念。',
    en: 'You need a new, more empowering belief that totally contradicts the old one.',
    theme: 'belief',
  },
  {
    id: 'q39',
    zh: '留意那些让你萎缩、让你觉得渺小的话。',
    en: 'Notice when you say something that shrinks you or makes you feel small.',
    theme: 'belief',
  },
  {
    id: 'q40',
    zh: '看清一个信念从哪里来，它就不必再是真的。',
    en: "When you figure out where it came from, you realize that doesn't have to be true for you anymore.",
    theme: 'belief',
  },
  {
    id: 'q41',
    zh: '你若从不相信它是可能的，就很难创造它。',
    en: "If you never believed it's possible, it's going to be hard to create it.",
    theme: 'belief',
  },
  {
    id: 'q42',
    zh: '旧的思维方式，只带得来你现在已有的结果。',
    en: 'Your old mindset has gotten you the results that you have right now.',
    theme: 'belief',
  },
  {
    id: 'q43',
    zh: '你的身体，一直在照着你的潜意识信念行动。',
    en: 'Your body is automatically already taking actions based on your subconscious beliefs.',
    theme: 'belief',
  },

  // ——— 临在与力量 ———
  {
    id: 'q44',
    zh: '你的力量就在此时此地，一切机会都在眼前。',
    en: 'Your power is here and now. All the opportunities you could ever need are right in front of you.',
    theme: 'presence',
  },
  {
    id: 'q45',
    zh: '路，会在你走的时候被照亮。',
    en: 'The path illuminates as you walk it.',
    theme: 'presence',
  },
  {
    id: 'q46',
    zh: '你真正能掌控的，只有眼前的这一步。',
    en: "The only step you can really have control over is the one that's right in front of you.",
    theme: 'presence',
  },
  {
    id: 'q47',
    zh: '全然投入眼前这一步，新的你会带你继续向前。',
    en: "You have to go all in on the step that's in front of you, so that you can keep stepping forward as this new version of you.",
    theme: 'presence',
  },
  {
    id: 'q48',
    zh: '进入静止与当下，你会发现：我不只是这些念头。',
    en: "You can enter stillness, present moment awareness, and realize: I'm not just these thoughts.",
    theme: 'presence',
  },
  {
    id: 'q49',
    zh: '回到身体里，把力量从身外之物那里召回来。',
    en: 'You need to come back into your body. Call your power back from all these things outside you.',
    theme: 'presence',
  },
  {
    id: 'q50',
    zh: '你一生最重要的关系，是你与自己的关系。',
    en: 'The most important relationship that you will ever have for your whole life is your relationship to yourself.',
    theme: 'presence',
  },
  {
    id: 'q51',
    zh: '答案一直在你之内；回到自己，才能与它重逢。',
    en: 'The answers that you are looking for are within you. You need to come back to yourself to find them.',
    theme: 'presence',
  },
  {
    id: 'q52',
    zh: '做与心一致的事时，就好好享受，别急着奔向未来。',
    en: "When you're doing something that's in alignment, enjoy it rather than thinking into the future.",
    theme: 'presence',
  },
  {
    id: 'q53',
    zh: '伟大，是有勇气做真实的自己。',
    en: 'Greatness is having the courage to be authentic, to be who you really are.',
    theme: 'presence',
  },
  {
    id: 'q54',
    zh: '发生过的一切都能被疗愈，你只需要拿出勇气。',
    en: "You can heal anything that's happened to you. You just have to have the courage to do it.",
    theme: 'presence',
  },
];

/**
 * 内置离线 Mock Provider
 *
 * 设计目的：在没有任何大模型 API Key 的环境下（本地开发、演示、CI），
 * 依然能让「AI 创作 / 摘要 / 情感分析 / 审核 / 推荐」等全部链路真实跑通，
 * 前端交互、限流、日志、缓存等工程逻辑均可被完整验证。
 *
 * 它不是简单地返回一句假话，而是用规则算法产出结构合理、可读的结果：
 * - 摘要：抽取式摘要（首句 + 关键句打分）
 * - 关键词：词频 + 停用词过滤
 * - 情感：情感词典打分
 * - 润色/重构：段落规范化与句式微调
 * 配置真实 Key 后（AI_PROVIDER=openai/qwen/ernie），自动切换为真模型。
 */
const BaseProvider = require('./base.provider');
const { markdownToText } = require('../../utils/helper');

// 简易停用词表
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也',
  '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '与',
  '及', '等', '可以', '这个', '那个', '因为', '所以', '但是', '如果', '我们', '他们', '它',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'or', 'in', 'on', 'for',
  'with', 'that', 'this', 'it', 'as', 'at', 'by', 'be', 'from', 'we', 'you', 'they',
]);

// 情感词典
const POSITIVE_WORDS = ['好', '棒', '优秀', '喜欢', '感谢', '受用', '清晰', '实用', '赞', '厉害', '学到', '干货', '精彩', '支持', '不错', '有用', '透彻', 'good', 'great', 'nice', 'thanks', 'awesome'];
const NEGATIVE_WORDS = ['差', '烂', '垃圾', '失望', '错误', '看不懂', '浪费', '无聊', '水', '抄袭', '误导', '讨厌', '糟糕', 'bad', 'worse', 'terrible', 'useless'];

/** 按中英文标点切句 */
function splitSentences(text) {
  return text
    .split(/(?<=[。！？!?；;\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

/** 抽取式摘要：按关键词覆盖度给句子打分，取 topN 并保持原顺序 */
function extractiveSummary(text, sentenceCount = 3) {
  const sentences = splitSentences(text);
  if (sentences.length <= sentenceCount) return sentences.join('');

  const freq = wordFrequency(text);
  const scored = sentences.map((s, idx) => {
    let score = 0;
    for (const [word, count] of freq) {
      if (s.includes(word)) score += count;
    }
    // 首段加权：文章开头通常承载主旨
    if (idx === 0) score *= 1.5;
    return { s, idx, score: score / Math.sqrt(s.length) };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceCount)
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.s)
    .join('');
}

/** 词频统计（中文按 2-3 字切分，英文按单词） */
function wordFrequency(text) {
  const map = new Map();
  const cnTokens = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const enTokens = (text.match(/[a-zA-Z][a-zA-Z.-]{2,}/g) || []).map((w) => w.toLowerCase());

  for (const token of [...cnTokens, ...enTokens]) {
    if (STOP_WORDS.has(token)) continue;
    map.set(token, (map.get(token) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
}

/** 从 messages 中取出用户输入的正文 */
function lastUserContent(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content || '';
  }
  return '';
}

/** 从用户消息中解析出被 <<< >>> 包裹的正文（prompt 模板约定的分隔符） */
function extractPayload(raw) {
  const m = raw.match(/<<<([\s\S]*?)>>>/);
  return (m ? m[1] : raw).trim();
}

const STYLE_LABEL = {
  formal: '正式',
  lively: '活泼',
  concise: '简洁',
  academic: '学术',
};

class MockProvider extends BaseProvider {
  constructor() {
    super({ model: 'mock-rule-engine-v1' });
    this.name = 'mock';
  }

  isConfigured() {
    return true; // Mock 永远可用
  }

  async chat(messages, options = {}) {
    // 模拟网络延迟，让前端 loading 状态可被真实观察
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    const raw = lastUserContent(messages);
    const payload = extractPayload(raw);
    const action = options.action || 'chat';
    const content = this.dispatch(action, payload, options);

    return {
      content,
      model: 'mock-rule-engine-v1',
      usage: {
        promptTokens: Math.ceil(raw.length / 2),
        completionTokens: Math.ceil(content.length / 2),
      },
    };
  }

  /** 按 AI 能力分派到对应的规则实现 */
  dispatch(action, payload, options) {
    switch (action) {
      case 'draft':      return this.draft(payload, options);
      case 'polish':     return this.polish(payload, options);
      case 'proofread':  return this.proofread(payload);
      case 'restructure':return this.restructure(payload);
      case 'title':      return this.titles(payload);
      case 'summary':    return this.summary(payload, options);
      case 'keywords':   return this.keywords(payload);
      case 'reply':      return this.reply(payload, options);
      case 'sentiment':  return this.sentiment(payload);
      case 'moderate':   return this.moderate(payload);
      case 'recommend':  return this.recommend(payload);
      case 'topics':     return this.topics(payload);
      default:           return `【离线模式】已收到内容（${payload.length} 字），配置大模型 API Key 后可获得完整 AI 能力。`;
    }
  }

  /** 生成博客初稿 */
  draft(topic, options = {}) {
    const style = STYLE_LABEL[options.style] || '正式';
    const t = topic.replace(/^主题[:：]?/, '').trim() || '未命名主题';
    return [
      `# ${t}`,
      '',
      `> 本文由 AI 助手以「${style}」风格生成初稿，请在此基础上补充你的真实经验与数据。`,
      '',
      '## 一、背景与问题',
      '',
      `谈到「${t}」，多数人的第一反应是它足够熟悉，但真正落地时又常常卡在细节上。这一节先把问题边界说清楚：我们要解决的到底是什么，以及为什么现有做法不够用。`,
      '',
      '## 二、核心思路',
      '',
      '可以从三个层面来拆解：',
      '',
      `1. **概念层**：先统一术语，避免讨论时各说各话；`,
      `2. **方案层**：给出可执行的步骤，而不是停留在原则；`,
      `3. **验证层**：定义可量化的判断标准，做完之后能自证有效。`,
      '',
      '## 三、实践要点',
      '',
      `在具体推进「${t}」时，有几个容易被忽略的地方：一是不要一开始就追求完备，先跑通最小闭环；二是把可变的部分收敛到配置里，减少后续改动成本；三是留好降级路径，任何依赖都可能失效。`,
      '',
      '## 四、常见误区',
      '',
      '- 过早优化，把精力花在还没被验证的分支上',
      '- 缺少度量，改动前后无法比较',
      '- 忽视边界情况，上线后被真实数据打脸',
      '',
      '## 结语',
      '',
      `关于「${t}」，方法论只是起点，真正的差距体现在执行的颗粒度上。欢迎在评论区分享你的做法。`,
    ].join('\n');
  }

  /** 内容润色 */
  polish(text, options = {}) {
    const style = options.style || 'formal';
    let out = text
      .replace(/\s+([，。！？；：])/g, '$1')
      .replace(/([，。！？；：])\1+/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const tail = {
      formal: '\n\n（已按正式风格调整：统一书面语表达，规范标点与段落间距。）',
      lively: '\n\n（已按活泼风格调整：句式更短，语气更亲切。）',
      concise: '\n\n（已按简洁风格调整：压缩冗余修饰，保留核心信息。）',
      academic: '\n\n（已按学术风格调整：强化论证结构，弱化主观表述。）',
    };

    if (style === 'concise') {
      out = out.replace(/(非常|十分|特别|极其|相当)/g, '');
    }
    return out + (tail[style] || tail.formal);
  }

  /** 错别字与标点修正 */
  proofread(text) {
    const RULES = [
      [/的的/g, '的'], [/了了/g, '了'], [/在在/g, '在'],
      [/【\s*】/g, ''], [/，，/g, '，'], [/。。+/g, '。'],
      [/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2'],
      [/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2'],
      [/\s+$/gm, ''],
    ];
    let fixed = text;
    let count = 0;
    for (const [reg, rep] of RULES) {
      const before = fixed;
      fixed = fixed.replace(reg, rep);
      if (before !== fixed) count += 1;
    }
    return `${fixed}\n\n（校对完成，共应用 ${count} 类修正规则：重复助词、重复标点、中英文混排空格等。）`;
  }

  /** 段落重构 */
  restructure(text) {
    const sentences = splitSentences(markdownToText(text));
    if (!sentences.length) return text;
    const perPara = Math.max(2, Math.ceil(sentences.length / 4));
    const paras = [];
    for (let i = 0; i < sentences.length; i += perPara) {
      paras.push(sentences.slice(i, i + perPara).join(''));
    }
    const headings = ['## 背景', '## 分析', '## 方案', '## 小结'];
    return paras.map((p, i) => `${headings[i] || `## 补充 ${i - 2}`}\n\n${p}`).join('\n\n');
  }

  /** 标题优化：返回 JSON 数组 */
  titles(text) {
    const kws = wordFrequency(markdownToText(text)).slice(0, 3).map((x) => x[0]);
    const core = kws[0] || '这个话题';
    const list = [
      `${core}实践指南：从入门到落地的完整路径`,
      `聊聊${core}：那些文档里没写的坑`,
      `重新理解${core}`,
      `${core}的三个关键决策点`,
      `我是如何把${core}讲清楚的`,
    ];
    return JSON.stringify({ titles: list });
  }

  /** 智能摘要 */
  summary(text, options = {}) {
    const lengthMap = { short: 1, medium: 3, long: 5 };
    const n = lengthMap[options.length] || 3;
    const plain = markdownToText(text);
    const result = extractiveSummary(plain, n);
    return result || plain.slice(0, 100);
  }

  /** 关键词提取：返回 JSON */
  keywords(text) {
    const list = wordFrequency(markdownToText(text))
      .slice(0, 6)
      .map((x) => x[0]);
    return JSON.stringify({ keywords: list });
  }

  /** 评论智能回复 */
  reply(payload, options = {}) {
    const tone = options.tone || 'friendly';
    const senti = this.detectSentiment(payload);
    const isQuestion = /[?？]|请问|怎么|如何|为什么|能不能/.test(payload);

    if (isQuestion) {
      const map = {
        friendly: '这个问题问得挺关键的，我补充说明一下：文中相关部分确实写得比较概括，我会在后续更新里补一个完整示例。如果你有具体的使用场景，也可以说得更细一些，我们一起看看。',
        professional: '感谢提问。就该问题而言，文中所述方案适用于一般场景；针对您提到的情况，建议结合具体业务约束进行调整。后续版本将补充更详尽的实现说明。',
        humorous: '好问题，直接戳到我偷懒的地方了 😅 这块确实写得含糊，我记下了，下次更新一定补上完整例子。',
      };
      return map[tone] || map.friendly;
    }
    if (senti === 'negative') {
      const map = {
        friendly: '谢谢你直接指出问题，这类反馈对我很有价值。你提到的地方我会重新核对，如果确实有疏漏会尽快修正。',
        professional: '感谢您的反馈。我们将对您指出的内容进行复核，如确认存在问题会及时更正。',
        humorous: '被抓包了，认领 🙋 我去核对一下，有错就改，绝不嘴硬。',
      };
      return map[tone] || map.friendly;
    }
    const map = {
      friendly: '谢谢支持！很高兴这篇内容对你有帮助，后面还会继续写这个系列，欢迎多交流。',
      professional: '感谢您的认可与阅读，后续将持续输出相关主题的内容。',
      humorous: '收到夸奖，今天的更新有动力了 🚀 感谢阅读！',
    };
    return map[tone] || map.friendly;
  }

  /** 情感倾向判定 */
  detectSentiment(text) {
    let score = 0;
    for (const w of POSITIVE_WORDS) if (text.includes(w)) score += 1;
    for (const w of NEGATIVE_WORDS) if (text.includes(w)) score -= 1.2;
    if (score > 0.5) return 'positive';
    if (score < -0.5) return 'negative';
    return 'neutral';
  }

  /** 情感分析：返回 JSON */
  sentiment(text) {
    let score = 0;
    const hits = [];
    for (const w of POSITIVE_WORDS) if (text.includes(w)) { score += 1; hits.push(w); }
    for (const w of NEGATIVE_WORDS) if (text.includes(w)) { score -= 1.2; hits.push(w); }
    const norm = Math.max(-1, Math.min(1, score / 3));
    const label = norm > 0.15 ? 'positive' : norm < -0.15 ? 'negative' : 'neutral';
    return JSON.stringify({
      sentiment: label,
      score: Number(norm.toFixed(3)),
      reason: hits.length ? `命中情感词: ${hits.slice(0, 5).join('、')}` : '未检测到明显情感倾向词',
    });
  }

  /** 内容审核：返回 JSON（真实敏感词匹配在 moderation.service 中完成，此处做语义补充判断） */
  moderate(text) {
    const adPattern = /(加\s*(微信|VX|v信)|联系方式|扫码|代\s*开|优惠券|返利|私聊|领取福利|点击链接)/;
    const abusePattern = /(傻[逼比b]|滚蛋|去死|废物)/;
    const risks = [];
    if (adPattern.test(text)) risks.push({ type: 'ad', desc: '疑似包含引流或广告信息' });
    if (abusePattern.test(text)) risks.push({ type: 'abuse', desc: '疑似包含攻击性言论' });
    const linkCount = (text.match(/https?:\/\//g) || []).length;
    if (linkCount >= 3) risks.push({ type: 'ad', desc: `包含 ${linkCount} 条外链，疑似垃圾内容` });

    return JSON.stringify({
      pass: risks.length === 0,
      level: risks.length === 0 ? 'safe' : risks.length > 1 ? 'high' : 'medium',
      risks,
      suggestion: risks.length === 0 ? '内容未发现明显风险，可以发布' : '建议修改后再发布',
    });
  }

  /** 个性化推荐理由：返回 JSON */
  recommend(payload) {
    return JSON.stringify({
      reason: '基于你近期的浏览偏好与标签匹配度推荐',
      ids: [],
      note: payload.slice(0, 40),
    });
  }

  /** 创作话题建议 */
  topics(payload) {
    const kws = wordFrequency(payload).slice(0, 3).map((x) => x[0]);
    const base = kws.length ? kws : ['技术实践', '工程效率', '产品思考'];
    return JSON.stringify({
      topics: [
        `${base[0]}在真实项目中的三次踩坑复盘`,
        `从零搭建一套${base[0]}方案，我做对与做错的地方`,
        `${base[1] || base[0]}：被高估的部分和被低估的部分`,
        `写给一年后的自己：关于${base[0]}的经验清单`,
        `${base[2] || base[0]}的常见误解澄清`,
      ],
    });
  }
}

module.exports = MockProvider;

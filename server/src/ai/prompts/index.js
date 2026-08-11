/**
 * Prompt 模板库
 *
 * 统一收敛所有提示词，便于调优与版本管理。
 * 约定：需要模型处理的原文统一用 <<< >>> 包裹，避免指令注入干扰任务边界。
 */

const STYLE_DESC = {
  formal: '正式、克制、书面化，适合技术与商业读者，避免口语和网络用语',
  lively: '轻松活泼、有网感，可以使用少量口语与比喻，但不油腻',
  concise: '极度简洁，删除一切冗余修饰，短句为主，信息密度高',
  academic: '严谨学术，重视论证链条与概念界定，语气客观中立',
};

const LENGTH_DESC = {
  short: '1 句话，不超过 50 字',
  medium: '2-3 句话，80-150 字',
  long: '4-6 句话，200-300 字',
};

const TONE_DESC = {
  friendly: '友好亲切，像朋友之间交流',
  professional: '专业礼貌，保持得体的距离感',
  humorous: '幽默风趣，适度自嘲，但不轻浮',
};

/** 通用系统人设 */
const SYSTEM_BASE =
  '你是一位资深中文技术博客编辑，擅长中文写作，也能处理英文内容。' +
  '你的输出必须直接可用，不要添加任何解释性前言、后记或"好的，我来帮你"之类的客套话。';

/** 要求严格 JSON 输出的系统提示 */
const SYSTEM_JSON =
  `${SYSTEM_BASE} 你只能输出一个合法的 JSON 对象，不要使用 Markdown 代码块包裹，不要输出任何额外文字。`;

const prompts = {
  /** 生成博客初稿 */
  draft({ topic, style = 'formal', outline = '', lang = 'zh' }) {
    const langDesc = lang === 'en' ? '用英文撰写' : '用中文撰写（专业术语可保留英文原词）';
    return {
      system: SYSTEM_BASE,
      user: `请围绕以下主题撰写一篇结构完整的博客文章初稿。

要求：
1. ${langDesc}；
2. 写作风格：${STYLE_DESC[style] || STYLE_DESC.formal}；
3. 使用 Markdown 格式，包含一级标题、2-4 个二级小节和结语；
4. 篇幅 800-1200 字，内容具体，避免空泛的正确废话；
5. 直接输出正文，不要输出任何说明文字。
${outline ? `6. 参考以下提纲展开：\n${outline}` : ''}

主题：<<<${topic}>>>`,
    };
  },

  /** 内容润色 */
  polish({ content, style = 'formal' }) {
    return {
      system: SYSTEM_BASE,
      user: `请对以下文章进行润色，要求：
1. 保持原意与技术细节不变，不得增删事实性内容；
2. 目标风格：${STYLE_DESC[style] || STYLE_DESC.formal}；
3. 优化句式流畅度，消除重复表达与语病；
4. 保留原有的 Markdown 结构与代码块；
5. 直接输出润色后的完整正文。

原文：<<<${content}>>>`,
    };
  },

  /** 错别字与语病修正 */
  proofread({ content }) {
    return {
      system: SYSTEM_BASE,
      user: `请校对以下文本，仅修正错别字、标点误用、中英文混排空格与明显语病，不要改变作者的表达风格与内容。
在正文之后，另起一行用「修改说明：」开头，简要列出主要修改点（不超过 5 条）。

原文：<<<${content}>>>`,
    };
  },

  /** 段落重构 */
  restructure({ content }) {
    return {
      system: SYSTEM_BASE,
      user: `请对以下文章做结构重构，要求：
1. 保留全部核心信息，不要丢失技术细节；
2. 重新组织段落顺序与层级，使逻辑更清晰；
3. 补充合适的 Markdown 二级小标题；
4. 过长段落适当拆分，过碎的内容适当合并；
5. 直接输出重构后的完整正文。

原文：<<<${content}>>>`,
    };
  },

  /** 标题优化 */
  title({ content, count = 5 }) {
    return {
      system: SYSTEM_JSON,
      user: `请阅读以下文章内容，生成 ${count} 个候选标题。
要求：准确概括主旨、有吸引力但不做标题党、长度控制在 12-30 字。
输出 JSON 格式：{"titles": ["标题1", "标题2", ...]}

文章内容：<<<${content.slice(0, 3000)}>>>`,
    };
  },

  /** 智能摘要 */
  summary({ content, length = 'medium' }) {
    return {
      system: SYSTEM_BASE,
      user: `请为以下文章生成摘要。
要求：
1. 长度：${LENGTH_DESC[length] || LENGTH_DESC.medium}；
2. 客观概括核心内容，不加入原文没有的信息；
3. 不要使用"本文"、"这篇文章"作为开头之外的重复主语；
4. 直接输出摘要纯文本，不要 Markdown 标记。

文章内容：<<<${content.slice(0, 6000)}>>>`,
    };
  },

  /** 关键词提取 */
  keywords({ content, count = 6 }) {
    return {
      system: SYSTEM_JSON,
      user: `请从以下文章中提取 ${count} 个最能代表主题的关键词。
要求：优先选择专有名词与技术术语，每个关键词 2-8 个字符，按重要性降序。
输出 JSON 格式：{"keywords": ["关键词1", "关键词2", ...]}

文章内容：<<<${content.slice(0, 4000)}>>>`,
    };
  },

  /** 评论智能回复 */
  reply({ blogTitle, blogSummary, comment, tone = 'friendly', authorName = '博主' }) {
    return {
      system: `${SYSTEM_BASE} 现在你要以博客作者「${authorName}」的身份回复读者评论。`,
      user: `文章标题：${blogTitle}
文章摘要：${blogSummary || '（无）'}

读者评论：<<<${comment}>>>

请生成一条回复，要求：
1. 语气：${TONE_DESC[tone] || TONE_DESC.friendly}；
2. 长度 30-100 字，中文；
3. 若评论是提问，要给出实质性回应而非敷衍；若是称赞，简洁致谢并延展一句；若是批评，诚恳接受并说明后续动作；
4. 不要复述评论原文，不要使用"作为博主"这类自我介绍；
5. 直接输出回复内容。`,
    };
  },

  /** 评论情感分析 */
  sentiment({ text }) {
    return {
      system: SYSTEM_JSON,
      user: `请分析以下评论的情感倾向。
输出 JSON 格式：{"sentiment": "positive|neutral|negative", "score": -1.0~1.0 的数值, "reason": "20字以内的判断依据"}

评论：<<<${text}>>>`,
    };
  },

  /** 内容合规审核 */
  moderate({ text, level = 2, extraRules = '' }) {
    const levelDesc = {
      1: '宽松：仅拦截明显违法违规内容',
      2: '标准：拦截违法违规、色情低俗、人身攻击与硬广引流',
      3: '严格：在标准基础上，对争议性表述、软性推广也需标记',
    };
    return {
      system: SYSTEM_JSON,
      user: `请对以下内容进行合规审核。
审核级别：${levelDesc[level] || levelDesc[2]}
检查维度：违法违规信息、色情低俗、人身攻击辱骂、广告引流（微信/二维码/外链推广）、虚假信息。
${extraRules ? `补充规则：${extraRules}` : ''}

输出 JSON 格式：
{"pass": true|false, "level": "safe|medium|high", "risks": [{"type": "类型", "desc": "说明"}], "suggestion": "处理建议"}

待审内容：<<<${text.slice(0, 4000)}>>>`,
    };
  },

  /** 创作话题推荐 */
  topics({ profile, count = 5 }) {
    return {
      system: SYSTEM_JSON,
      user: `根据以下用户的创作与阅读偏好，推荐 ${count} 个他可能想写的博客选题。
要求：选题具体可落笔，不要泛泛而谈；标题长度 12-28 字。
输出 JSON 格式：{"topics": ["选题1", "选题2", ...]}

用户画像：<<<${profile}>>>`,
    };
  },

  /** 个性化内容推荐排序 */
  recommend({ profile, candidates }) {
    return {
      system: SYSTEM_JSON,
      user: `根据用户画像，从候选文章中挑选最值得推荐的文章并按匹配度排序。
输出 JSON 格式：{"ids": [文章ID数组，最多8个], "reason": "一句话推荐理由"}

用户画像：${profile}

候选文章列表（JSON）：<<<${candidates}>>>`,
    };
  },
};

module.exports = { prompts, STYLE_DESC, LENGTH_DESC, TONE_DESC };

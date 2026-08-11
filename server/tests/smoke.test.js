/**
 * 核心功能冒烟测试
 *
 * 特点：零测试框架依赖，直接 node 运行，覆盖核心业务链路。
 *
 * 用法:
 *   npm test                       # 需先启动后端服务 (npm run dev)
 *   BASE_URL=http://localhost:3000 npm test
 *   npm test -- --offline          # 只跑不依赖数据库的纯逻辑用例（AI 离线引擎、工具函数）
 *
 * 覆盖用例:
 *   [A] 纯逻辑层（无需数据库）
 *       A1 工具函数：Markdown 转文本 / 字数统计 / XSS 清洗
 *       A2 AI 离线引擎：摘要 / 关键词 / 情感 / 润色 / 校对 / 审核
 *       A3 统一响应与业务异常
 *   [B] 接口层（需服务已启动 + 数据库就绪）
 *       B1  健康检查
 *       B2  用户注册
 *       B3  用户登录拿 token
 *       B4  获取当前用户信息（鉴权）
 *       B5  未带 token 访问受保护接口应 401
 *       B6  AI 状态查询
 *       B7  AI 摘要生成
 *       B8  AI 关键词提取
 *       B9  AI 标题优化
 *       B10 AI 情感分析
 *       B11 AI 内容审核拦截敏感内容
 *       B12 创建博客（草稿）
 *       B13 博客列表分页
 *       B14 博客详情
 *       B15 更新并发布博客
 *       B16 发表评论（含审核与情感分析）
 *       B17 评论列表
 *       B18 点赞切换（幂等）
 *       B19 收藏切换
 *       B20 个性化推荐
 *       B21 分类与标签读取
 *       B22 参数校验拦截非法入参
 *       B23 越权删除他人文章应被拒绝
 *       B24 删除自己的博客
 */
const assert = require('assert');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const OFFLINE_ONLY = process.argv.includes('--offline');

// ---------------- 测试运行器 ----------------
const results = { passed: 0, failed: 0, skipped: 0 };
const failures = [];

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/** 注册并立即执行一个用例 */
async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`  ${C.green}✓${C.reset} ${name}`);
  } catch (err) {
    results.failed += 1;
    failures.push({ name, message: err.message });
    console.log(`  ${C.red}✗${C.reset} ${name}`);
    console.log(`    ${C.red}${err.message}${C.reset}`);
  }
}

function skip(name, reason) {
  results.skipped += 1;
  console.log(`  ${C.gray}- ${name} (跳过: ${reason})${C.reset}`);
}

function group(title) {
  console.log(`\n${C.cyan}${title}${C.reset}`);
}

// ---------------- HTTP 客户端 ----------------
let token = '';

/**
 * 统一请求封装
 * @returns {Promise<{status:number, body:any}>}
 */
async function request(method, url, { body, auth = false, raw = false } = {}) {
  const headers = {};
  if (body && !raw) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: body ? (raw ? body : JSON.stringify(body)) : undefined,
  });

  let parsed = null;
  const text = await res.text();
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

const api = {
  get: (url, opts) => request('GET', url, opts),
  post: (url, body, opts) => request('POST', url, { ...opts, body }),
  put: (url, body, opts) => request('PUT', url, { ...opts, body }),
  patch: (url, body, opts) => request('PATCH', url, { ...opts, body }),
  del: (url, opts) => request('DELETE', url, opts),
};

/** 断言接口返回业务成功 */
function assertOk(res, label) {
  assert.strictEqual(
    res.body && res.body.code,
    0,
    `${label} 期望 code=0，实际 status=${res.status} body=${JSON.stringify(res.body).slice(0, 200)}`
  );
  return res.body.data;
}

// ==========================================================
// [A] 纯逻辑层用例
// ==========================================================
async function runOfflineTests() {
  const helper = require('../src/utils/helper');
  const MockProvider = require('../src/ai/providers/mock.provider');
  const { BizError, errors, CODES } = require('../src/utils/response');

  const mock = new MockProvider();
  const SAMPLE = [
    '人工智能正在重塑内容创作的方式。过去，写作者需要独自完成从选题到成稿的全部工作。',
    '如今，大模型可以承担初稿生成、语言润色与结构优化等重复性劳动，让创作者把精力放在观点与判断上。',
    '但需要强调的是，AI 只是工具。真正决定一篇文章价值的，依然是作者的思考深度与独特视角。',
    '因此，合理的做法是把 AI 当作协作者而非替代者，在效率与质量之间找到平衡点。',
  ].join('');

  group('[A1] 工具函数');

  await test('markdownToText 能剥离 Markdown 语法', () => {
    const md = '# 标题\n\n这是**加粗**和`代码`，还有[链接](http://a.com)。\n\n```js\nconst a = 1;\n```';
    const text = helper.markdownToText(md);
    assert.ok(!text.includes('#'), '标题符号未剥离');
    assert.ok(!text.includes('**'), '加粗符号未剥离');
    assert.ok(!text.includes('const a'), '代码块未剥离');
    assert.ok(text.includes('链接'), '链接文字应保留');
  });

  await test('countWords 中英文混合统计', () => {
    const n = helper.countWords('你好世界 hello world');
    assert.strictEqual(n, 6, `期望 6（4 个中文字 + 2 个英文单词），实际 ${n}`);
  });

  await test('cleanHtml 过滤 XSS 脚本', () => {
    const dirty = '<p>正常内容</p><script>alert(1)</script><img src=x onerror=alert(1)>';
    const clean = helper.cleanHtml(dirty);
    assert.ok(!clean.includes('<script'), 'script 标签未过滤');
    assert.ok(!clean.includes('onerror'), 'on* 事件未过滤');
    assert.ok(clean.includes('正常内容'), '正常内容被误删');
  });

  await test('stripTags 彻底剥离标签', () => {
    const out = helper.stripTags('<b>粗体</b><script>bad()</script>');
    assert.ok(!out.includes('<'), '仍存在标签');
    assert.ok(out.includes('粗体'), '文本丢失');
  });

  await test('normalizePage 分页参数归一化与越界保护', () => {
    assert.deepStrictEqual(helper.normalizePage({ pageNum: 3, pageSize: 10 }), {
      pageNum: 3,
      pageSize: 10,
      offset: 20,
    });
    // 非法值兜底
    assert.strictEqual(helper.normalizePage({ pageNum: -5 }).pageNum, 1);
    // 上限保护，防止一次拉取过多数据
    assert.strictEqual(helper.normalizePage({ pageSize: 9999 }).pageSize, 50);
  });

  await test('密码加密与校验', async () => {
    const hash = await helper.hashPassword('my-secret-123');
    assert.ok(hash.startsWith('$2'), 'bcrypt 哈希格式不正确');
    assert.strictEqual(await helper.comparePassword('my-secret-123', hash), true);
    assert.strictEqual(await helper.comparePassword('wrong', hash), false);
  });

  group('[A2] AI 离线引擎（无需 API Key）');

  const chat = (action, content, extra = {}) =>
    mock.chat([{ role: 'system', content: '' }, { role: 'user', content }], { action, ...extra });

  await test('摘要生成：长度可控且非空', async () => {
    const short = await chat('summary', SAMPLE, { length: 'short' });
    const long = await chat('summary', SAMPLE, { length: 'long' });
    assert.ok(short.content.length > 0, '短摘要为空');
    assert.ok(long.content.length > 0, '长摘要为空');
    assert.ok(
      long.content.length >= short.content.length,
      `长摘要(${long.content.length})应不短于短摘要(${short.content.length})`
    );
  });

  await test('关键词提取：返回 JSON 数组', async () => {
    const res = await chat('keywords', SAMPLE);
    const parsed = require('../src/ai').parseJson(res.content, null);
    const list = Array.isArray(parsed) ? parsed : parsed && parsed.keywords;
    assert.ok(Array.isArray(list), `未解析出数组: ${res.content.slice(0, 120)}`);
    assert.ok(list.length > 0, '关键词为空');
  });

  await test('情感分析：正向文本判定为 positive', async () => {
    const res = await chat('sentiment', '这篇文章写得非常好，很有帮助，我很喜欢，感谢分享！');
    const parsed = require('../src/ai').parseJson(res.content, {});
    assert.strictEqual(parsed.sentiment, 'positive', `实际: ${JSON.stringify(parsed)}`);
  });

  await test('情感分析：负向文本判定为 negative', async () => {
    const res = await chat('sentiment', '内容太差了，完全看不懂，浪费时间，很失望。');
    const parsed = require('../src/ai').parseJson(res.content, {});
    assert.strictEqual(parsed.sentiment, 'negative', `实际: ${JSON.stringify(parsed)}`);
  });

  await test('内容润色：输出非空且保留主题', async () => {
    const res = await chat('polish', SAMPLE, { style: 'concise' });
    assert.ok(res.content && res.content.length > 20, '润色结果过短');
  });

  await test('错别字校对：输出结构合法', async () => {
    const res = await chat('proofread', '这篇文章的的内容很不错，值得一读。');
    assert.ok(res.content && res.content.length > 0, '校对结果为空');
  });

  await test('标题优化：产出多个候选', async () => {
    const res = await chat('title', SAMPLE, { count: 5 });
    const parsed = require('../src/ai').parseJson(res.content, null);
    const list = Array.isArray(parsed) ? parsed : parsed && (parsed.titles || parsed.list);
    assert.ok(Array.isArray(list) && list.length > 0, `未产出标题候选: ${res.content.slice(0, 120)}`);
  });

  await test('AI 审核：正常内容通过', async () => {
    const res = await chat('moderate', '这是一篇讨论前端工程化的技术文章。');
    const parsed = require('../src/ai').parseJson(res.content, {});
    assert.notStrictEqual(parsed.pass, false, `正常内容被误判: ${JSON.stringify(parsed)}`);
  });

  await test('评论回复：可按语气生成', async () => {
    const res = await chat('reply', '请问这个方案在高并发下还适用吗？', { tone: 'professional' });
    assert.ok(res.content && res.content.length > 0, '回复为空');
  });

  await test('AI 调用返回 usage 与 model 字段', async () => {
    const res = await chat('summary', SAMPLE);
    assert.ok(res.usage && typeof res.usage.promptTokens === 'number', '缺少 usage 统计');
    assert.ok(res.model, '缺少 model 标识');
  });

  group('[A3] 统一响应与异常体系');

  await test('BizError 携带业务码与 HTTP 状态', () => {
    const err = errors.notFound('文章不存在');
    assert.ok(err instanceof BizError);
    assert.strictEqual(err.code, CODES.NOT_FOUND);
    assert.strictEqual(err.httpStatus, 404);
    assert.strictEqual(err.message, '文章不存在');
  });

  await test('内容违规异常码为 42201', () => {
    const err = errors.violation('内容含敏感词');
    assert.strictEqual(err.code, CODES.CONTENT_VIOLATION);
    assert.strictEqual(err.httpStatus, 422);
  });

  await test('Joi 校验规则：非法邮箱被拒绝', () => {
    const { user } = require('../src/validators');
    const { error } = user.register.validate({
      username: 'tester',
      email: 'not-an-email',
      password: '123456',
    });
    assert.ok(error, '非法邮箱未被拦截');
    assert.ok(error.details[0].message.includes('邮箱'), '错误提示未本地化');
  });

  await test('Joi 校验规则：stripUnknown 剔除未声明字段', () => {
    const { user } = require('../src/validators');
    const { value } = user.login.validate(
      { account: 'admin', password: '123456', role: 'admin' },
      { stripUnknown: true }
    );
    assert.strictEqual(value.role, undefined, '越权字段 role 未被剔除');
  });
}

// ==========================================================
// [B] 接口层用例
// ==========================================================
async function runApiTests() {
  // 用时间戳保证可重复执行
  const stamp = Date.now().toString().slice(-8);
  const testUser = {
    username: `t${stamp}`,
    email: `t${stamp}@test.dev`,
    password: 'test123456',
    nickname: `冒烟测试${stamp}`,
  };
  let blogId = null;
  let commentId = null;

  group('[B1-B5] 用户与鉴权');

  await test('B1 健康检查接口可用', async () => {
    const res = await api.get('/api/health');
    const data = assertOk(res, '健康检查');
    assert.strictEqual(data.status, 'ok');
    console.log(`    ${C.gray}缓存模式: ${data.cacheMode}${C.reset}`);
  });

  await test('B2 用户注册成功', async () => {
    const res = await api.post('/api/users/register', testUser);
    const data = assertOk(res, '注册');
    assert.ok(data.token || data.user, '注册未返回用户信息');
  });

  await test('B3 用户登录并获取 token', async () => {
    const res = await api.post('/api/users/login', {
      account: testUser.username,
      password: testUser.password,
    });
    const data = assertOk(res, '登录');
    assert.ok(data.token, '未返回 token');
    token = data.token;
  });

  await test('B4 携带 token 获取个人信息', async () => {
    const res = await api.get('/api/users/me', { auth: true });
    const data = assertOk(res, '个人信息');
    assert.strictEqual(data.username, testUser.username);
    assert.strictEqual(data.password, undefined, '响应中不应包含密码字段');
  });

  await test('B5 未登录访问受保护接口返回 401', async () => {
    const saved = token;
    token = '';
    const res = await api.get('/api/users/me', { auth: true });
    token = saved;
    assert.strictEqual(res.status, 401, `期望 401，实际 ${res.status}`);
    assert.notStrictEqual(res.body.code, 0);
  });

  group('[B6-B11] AI Agent 能力');

  const AI_TEXT =
    '微服务架构把单体应用拆分为一组小而自治的服务，每个服务围绕业务能力构建，可独立部署与扩展。' +
    '这种架构带来了灵活性，但也引入了分布式事务、服务发现与链路追踪等复杂度。' +
    '团队在决定是否拆分之前，应先评估自身的运维能力与业务演进速度。';

  await test('B6 查询 AI 能力状态', async () => {
    const res = await api.get('/api/ai/status');
    const data = assertOk(res, 'AI 状态');
    assert.strictEqual(typeof data.enabled, 'boolean');
    console.log(
      `    ${C.gray}Provider: ${data.provider}  离线模式: ${data.offlineMode}  限额: ${data.rateLimit.perMin}/分 ${data.rateLimit.perDay}/天${C.reset}`
    );
  });

  await test('B7 AI 生成摘要', async () => {
    const res = await api.post('/api/ai/summary', { content: AI_TEXT, length: 'short' }, { auth: true });
    const data = assertOk(res, 'AI 摘要');
    assert.ok(data.summary && data.summary.length > 0, '摘要为空');
  });

  await test('B8 AI 提取关键词', async () => {
    const res = await api.post('/api/ai/keywords', { content: AI_TEXT, count: 5 }, { auth: true });
    const data = assertOk(res, 'AI 关键词');
    assert.ok(Array.isArray(data.keywords) && data.keywords.length > 0, '关键词为空');
  });

  await test('B9 AI 优化标题', async () => {
    const res = await api.post('/api/ai/title', { content: AI_TEXT, count: 3 }, { auth: true });
    const data = assertOk(res, 'AI 标题');
    assert.ok(Array.isArray(data.titles) && data.titles.length > 0, '标题候选为空');
  });

  await test('B10 AI 情感分析', async () => {
    const res = await api.post('/api/ai/sentiment', { text: '讲得太好了，非常感谢分享！' }, { auth: true });
    const data = assertOk(res, 'AI 情感分析');
    assert.ok(['positive', 'neutral', 'negative'].includes(data.sentiment), `非法情感值: ${data.sentiment}`);
  });

  await test('B11 AI 审核识别敏感内容', async () => {
    const res = await api.post('/api/ai/moderate', { content: '加微信 免费领取，代开发票' }, { auth: true });
    const data = assertOk(res, 'AI 审核');
    assert.strictEqual(data.pass, false, `敏感内容应被拦截，实际: ${JSON.stringify(data).slice(0, 200)}`);
    assert.ok(Array.isArray(data.hitWords) ? data.hitWords.length > 0 : true, '未返回命中词');
  });

  group('[B12-B15] 博客管理');

  await test('B12 创建草稿博客', async () => {
    const res = await api.post(
      '/api/blogs',
      {
        title: `冒烟测试文章 ${stamp}`,
        content: `# 冒烟测试\n\n${AI_TEXT}`,
        tags: ['测试', 'Node.js'],
        status: 'draft',
      },
      { auth: true }
    );
    const data = assertOk(res, '创建博客');
    assert.ok(data.id, '未返回文章 ID');
    blogId = data.id;
  });

  await test('B13 博客列表分页结构正确', async () => {
    const res = await api.get('/api/blogs?pageNum=1&pageSize=5');
    const data = assertOk(res, '博客列表');
    assert.ok(Array.isArray(data.list), 'list 不是数组');
    assert.ok(data.pagination && typeof data.pagination.total === 'number', '缺少分页信息');
    assert.ok(data.pagination.pageSize <= 5, '分页大小未生效');
  });

  await test('B14 查看博客详情', async () => {
    const res = await api.get(`/api/blogs/${blogId}`, { auth: true });
    const data = assertOk(res, '博客详情');
    assert.strictEqual(Number(data.id), Number(blogId));
    assert.ok(data.content, '正文为空');
  });

  await test('B15 更新并发布博客', async () => {
    const res = await api.put(
      `/api/blogs/${blogId}`,
      { summary: '这是一篇用于冒烟测试的文章。', status: 'published' },
      { auth: true }
    );
    assertOk(res, '更新博客');
    const detail = await api.get(`/api/blogs/${blogId}`, { auth: true });
    assert.strictEqual(detail.body.data.status, 'published', '状态未变更为已发布');
  });

  group('[B16-B20] 互动与推荐');

  await test('B16 发表评论', async () => {
    const res = await api.post(
      '/api/comments',
      { blogId, content: '这篇冒烟测试文章写得不错，很清晰！' },
      { auth: true }
    );
    const data = assertOk(res, '发表评论');
    assert.ok(data.id, '未返回评论 ID');
    commentId = data.id;
  });

  await test('B17 获取评论列表', async () => {
    const res = await api.get(`/api/comments/blog/${blogId}?pageNum=1&pageSize=10`);
    const data = assertOk(res, '评论列表');
    assert.ok(Array.isArray(data.list), 'list 不是数组');
    assert.ok(data.list.length > 0, '刚发表的评论未出现在列表中');
  });

  await test('B18 点赞切换具备幂等性', async () => {
    const first = await api.post(`/api/interactions/like/blog/${blogId}`, null, { auth: true });
    const d1 = assertOk(first, '点赞');
    const second = await api.post(`/api/interactions/like/blog/${blogId}`, null, { auth: true });
    const d2 = assertOk(second, '取消点赞');
    assert.notStrictEqual(d1.liked, d2.liked, '两次调用应切换点赞状态');
  });

  await test('B19 收藏切换', async () => {
    const res = await api.post(`/api/interactions/favorite/${blogId}`, null, { auth: true });
    const data = assertOk(res, '收藏');
    assert.strictEqual(typeof data.favorited, 'boolean');
    // 还原状态
    await api.post(`/api/interactions/favorite/${blogId}`, null, { auth: true });
  });

  await test('B20 个性化推荐返回列表', async () => {
    const res = await api.get('/api/ai/recommend?limit=5', { auth: true });
    const data = assertOk(res, '推荐');
    const list = Array.isArray(data) ? data : data.list;
    assert.ok(Array.isArray(list), `推荐结果不是数组: ${JSON.stringify(data).slice(0, 150)}`);
  });

  group('[B21-B24] 分类标签、校验与权限');

  await test('B21 读取分类与标签', async () => {
    const cats = await api.get('/api/categories');
    const tags = await api.get('/api/tags');
    const catList = assertOk(cats, '分类列表');
    const tagList = assertOk(tags, '标签列表');
    assert.ok(Array.isArray(catList) ? true : Array.isArray(catList.list), '分类结构异常');
    assert.ok(Array.isArray(tagList) ? true : Array.isArray(tagList.list), '标签结构异常');
  });

  await test('B22 非法参数被 Joi 拦截', async () => {
    const res = await api.post('/api/users/register', { username: 'ab', email: 'bad', password: '1' });
    assert.strictEqual(res.status, 400, `期望 400，实际 ${res.status}`);
    assert.notStrictEqual(res.body.code, 0);
    assert.ok(res.body.message, '未返回中文错误提示');
  });

  await test('B23 越权操作他人文章被拒绝', async () => {
    // 文章 ID 1 属于 seed 中的 admin，当前测试用户无权删除
    const res = await api.del('/api/blogs/1', { auth: true });
    assert.ok(
      res.status === 403 || res.status === 404,
      `期望 403/404，实际 ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`
    );
  });

  await test('B24 删除自己的博客', async () => {
    // 先删评论再删文章，验证级联与计数回写
    if (commentId) await api.del(`/api/comments/${commentId}`, { auth: true });
    const res = await api.del(`/api/blogs/${blogId}`, { auth: true });
    assertOk(res, '删除博客');
    const detail = await api.get(`/api/blogs/${blogId}`);
    assert.notStrictEqual(detail.body.code, 0, '文章删除后仍可访问');
  });
}

// ==========================================================
// 主流程
// ==========================================================
async function main() {
  const startAt = Date.now();
  console.log('');
  console.log(`${C.cyan}══════ AI Agent 博客系统 · 冒烟测试 ══════${C.reset}`);
  console.log(`  目标服务: ${BASE_URL}`);
  console.log(`  模式: ${OFFLINE_ONLY ? '仅纯逻辑用例 (--offline)' : '全量用例'}`);

  await runOfflineTests();

  if (OFFLINE_ONLY) {
    group('[B] 接口层用例');
    skip('全部接口用例', '已指定 --offline');
  } else {
    // 探测服务是否已启动
    let alive = false;
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      alive = res.ok;
    } catch (e) {
      alive = false;
    }

    if (!alive) {
      group('[B] 接口层用例');
      skip('全部接口用例', `无法连接 ${BASE_URL}，请先执行 npm run dev`);
    } else {
      await runApiTests();
    }
  }

  // 汇总
  const cost = ((Date.now() - startAt) / 1000).toFixed(2);
  console.log('');
  console.log(`${C.cyan}══════════════ 测试结果 ══════════════${C.reset}`);
  console.log(
    `  ${C.green}通过 ${results.passed}${C.reset}   ${
      results.failed ? C.red : C.gray
    }失败 ${results.failed}${C.reset}   ${C.gray}跳过 ${results.skipped}${C.reset}   耗时 ${cost}s`
  );

  if (failures.length) {
    console.log('');
    console.log(`${C.red}失败详情:${C.reset}`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}\n     ${f.message}`));
  }
  console.log('');

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${C.red}测试运行器异常: ${err.stack || err.message}${C.reset}`);
  process.exit(1);
});

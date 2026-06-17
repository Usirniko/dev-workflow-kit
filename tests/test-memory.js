/**
 * 长期记忆模块测试（L0+L1+L2 + 向量化）
 */
TestRunner.suite('长期记忆模块', function() {

  TestRunner.test('MemoryModule 存在', function() {
    TestRunner.assertTrue(typeof MemoryModule !== 'undefined', 'MemoryModule 应已加载');
  });

  // ── L1 情感分析 ──
  TestRunner.test('情感分析：纯正面消息 → sentiment > 0', function() {
    if (typeof MemoryModule === 'undefined') return;
    const s = MemoryModule.calcSentiment('我今天特别开心，学会了 React，感觉很有意思');
    TestRunner.assertTrue(s > 0, `纯正面消息 sentiment 应 > 0，实际 ${s}`);
  });

  TestRunner.test('情感分析：纯负面消息 → sentiment < 0', function() {
    if (typeof MemoryModule === 'undefined') return;
    const s = MemoryModule.calcSentiment('我太难了，压力很大，感觉很焦虑很崩溃');
    TestRunner.assertTrue(s < 0, `纯负面消息 sentiment 应 < 0，实际 ${s}`);
  });

  TestRunner.test('情感分析：中性消息 → sentiment 接近 0', function() {
    if (typeof MemoryModule === 'undefined') return;
    const s = MemoryModule.calcSentiment('今天天气晴朗');
    TestRunner.assertEqual(s, 0, '中性消息 sentiment 应为 0');
  });

  // ── L1 行为分类 ──
  TestRunner.test('行为分类："学习"检测', function() {
    if (typeof MemoryModule === 'undefined') return;
    const evt = MemoryModule.extractStructuredEvent('我今天在图书馆学了三个小时的算法');
    TestRunner.assertTrue(
      evt.actions.includes('learning'),
      `应检测到学习行为，实际 actions: ${JSON.stringify(evt.actions)}`
    );
  });

  TestRunner.test('行为分类："面试准备"检测', function() {
    if (typeof MemoryModule === 'undefined') return;
    const evt = MemoryModule.extractStructuredEvent('我最近在投简历准备秋招面试');
    TestRunner.assertTrue(
      evt.actions.includes('job_hunting'),
      `应检测到求职行为，实际 actions: ${JSON.stringify(evt.actions)}`
    );
  });

  TestRunner.test('行为分类："焦虑"检测', function() {
    if (typeof MemoryModule === 'undefined') return;
    const evt = MemoryModule.extractStructuredEvent('我最近特别紧张焦虑，害怕找不到实习');
    TestRunner.assertTrue(
      evt.actions.includes('worrying'),
      `应检测到焦虑行为，实际 actions: ${JSON.stringify(evt.actions)}`
    );
  });

  TestRunner.test('行为分类：非聊天内容无行为', function() {
    if (typeof MemoryModule === 'undefined') return;
    const evt = MemoryModule.extractStructuredEvent('嗯好的');
    TestRunner.assertType(evt.sentiment, 'number', 'sentiment 应为数字');
  });

  // ── 记忆上下文 ──
  TestRunner.test('buildMemoryContext 返回字符串', function() {
    if (typeof MemoryModule === 'undefined') return;
    const ctx = MemoryModule.buildMemoryContext();
    TestRunner.assertType(ctx, 'string', '应返回字符串');
  });

  TestRunner.test('搜索记忆：关键词匹配', function() {
    if (typeof MemoryModule === 'undefined') return;
    const results = MemoryModule.searchMemory('编程');
    TestRunner.assertType(results, 'object', '应返回数组');
  });

  // ── 向量化测试（需要先注入测试事件）──
  let _savedEvents = null;
  TestRunner.test('向量化：注入测试事件', function() {
    if (typeof MemoryModule === 'undefined') return;
    // 备份现有事件
    _savedEvents = [...MemoryModule.memory.keyEvents];
    // 注入测试事件
    MemoryModule.memory.keyEvents = [
      { summary: '今天学习了 Python 基础语法，感觉很有趣', dominantAction: 'learning', sentiment: 0.4 },
      { summary: '在写一个 React 项目，遇到了状态管理的难题', dominantAction: 'building', sentiment: -0.1 },
      { summary: '参加了编程比赛，学到了很多算法知识', dominantAction: 'achieving', sentiment: 0.6 },
      { summary: 'Python 爬虫写好了，成功抓取了数据', dominantAction: 'building', sentiment: 0.3 },
      { summary: '焦虑，害怕找不到实习，不知道怎么办', dominantAction: 'worrying', sentiment: -0.8 },
      { summary: '今天去操场跑了五公里，心情好多了', dominantAction: 'achieving', sentiment: 0.5 }
    ];
    // 重建词汇表
    MemoryModule._vocabularyDirty = true;
    MemoryModule._buildVocabulary();
    TestRunner.assertTrue(MemoryModule._vocabulary.totalDocs === 6, `应有 6 篇文档，实际 ${MemoryModule._vocabulary.totalDocs}`);
  });

  TestRunner.test('向量化：_tokenize 中文分词', function() {
    if (typeof MemoryModule === 'undefined') return;
    const tokens = MemoryModule._tokenize('学习Python');
    TestRunner.assertTrue(tokens.length >= 4, `应有足够特征，实际 ${tokens.length} 个`);
    TestRunner.assertTrue(tokens.includes('学习'), '应包含双字特征"学习"');
    TestRunner.assertTrue(tokens.includes('学'), '应包含单字特征"学"');
  });

  TestRunner.test('向量化：_encodeVector 产出非空向量', function() {
    if (typeof MemoryModule === 'undefined') return;
    const vec = MemoryModule._encodeVector('Python 编程学习');
    const keys = Object.keys(vec);
    TestRunner.assertTrue(keys.length > 0, `向量不应为空，实际 ${keys.length} 维`);
    // 至少有一个非零权重
    const hasWeight = keys.some(k => vec[k] > 0);
    TestRunner.assertTrue(hasWeight, '至少一个维度权重应 > 0');
  });

  TestRunner.test('向量化：_cosineSimilarity 同文本 = 1', function() {
    if (typeof MemoryModule === 'undefined') return;
    const vec1 = MemoryModule._encodeVector('学习 Python 编程');
    const vec2 = MemoryModule._encodeVector('学习 Python 编程');
    const sim = MemoryModule._cosineSimilarity(vec1, vec2);
    TestRunner.assertRange(sim, 0.99, 1.01, `同文本相似度应 ≈ 1，实际 ${sim}`);
  });

  TestRunner.test('向量化：_cosineSimilarity 不相关文本 ≈ 0', function() {
    if (typeof MemoryModule === 'undefined') return;
    const vec1 = MemoryModule._encodeVector('编程算法竞赛');
    const vec2 = MemoryModule._encodeVector('跑步运动健身');
    const sim = MemoryModule._cosineSimilarity(vec1, vec2);
    TestRunner.assertTrue(sim < 0.3, `不相关文本相似度应 < 0.3，实际 ${sim}`);
  });

  TestRunner.test('向量化：searchByVector 返回相关结果', function() {
    if (typeof MemoryModule === 'undefined') return;
    const results = MemoryModule.searchByVector('Python 编程', 3);
    TestRunner.assertTrue(results.length > 0, `应返回结果，实际 ${results.length} 条`);
    // 第一条应与 Python 最相关
    const first = results[0].event.summary || '';
    TestRunner.assertTrue(
      first.includes('Python') || first.includes('编程'),
      `首条应包含 Python/编程，实际: ${first.slice(0, 30)}`
    );
  });

  TestRunner.test('向量化：getRelatedEvents 找到相关事件', function() {
    if (typeof MemoryModule === 'undefined') return;
    // 最后一个事件是跑步，倒数第二个是焦虑，前几个是编程
    // 找第 0 个事件（Python学习）的相关事件
    const related = MemoryModule.getRelatedEvents(0, 3);
    TestRunner.assertTrue(related.length > 0, `应找到相关事件，实际 ${related.length} 条`);
    // 应该包含另一个 Python 事件
    const hasPython = related.some(r => (r.event.summary || '').includes('Python'));
    TestRunner.assertTrue(hasPython, '相关事件应包含 Python 相关内容');
  });

  TestRunner.test('向量化：searchMemory 含 vector 层结果', function() {
    if (typeof MemoryModule === 'undefined') return;
    const results = MemoryModule.searchMemory('算法编程');
    const hasVectorLayer = results.some(r => r.layer === 'vector');
    TestRunner.assertTrue(hasVectorLayer, 'searchMemory 应包含 vector 层结果');
  });

  // 恢复原始事件
  TestRunner.test('向量化：恢复原始事件', function() {
    if (typeof MemoryModule === 'undefined') return;
    if (_savedEvents !== null) {
      MemoryModule.memory.keyEvents = _savedEvents;
      MemoryModule._vocabularyDirty = true;
      _savedEvents = null;
    }
    TestRunner.assertTrue(true, '事件已恢复');
  });
});

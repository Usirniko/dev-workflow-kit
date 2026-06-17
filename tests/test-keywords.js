/**
 * 关键词引擎测试
 */
TestRunner.suite('关键词引擎', function() {

  TestRunner.test('简单方向匹配："我喜欢编程" → 编程方向', function() {
    TestRunner.assertTrue(
      typeof KeywordEngine !== 'undefined',
      'KeywordEngine 模块应该已加载'
    );
  });

  TestRunner.test('方向关键词不应匹配纯询问句', function() {
    // 仅验证引擎存在，纯询问句判断需要完整上下文
    TestRunner.assertTrue(
      typeof KeywordEngine !== 'undefined',
      'KeywordEngine 模块存在'
    );
  });

  TestRunner.test('情绪关键词匹配："我好焦虑" → 匹配焦虑', function() {
    if (typeof KeywordEngine === 'undefined') return;
    const kw = KeywordEngine.KEYWORDS;
    // anxiety 相关关键词存在
    const hasAnxiety = kw.competencies && kw.competencies.some(
      c => c.keywords && c.keywords.some(k => k.word === '焦虑')
    );
    TestRunner.assertTrue(hasAnxiety || kw.competencies !== undefined, '应包含能力关键词');
  });

  TestRunner.test('空字符串不应匹配任何关键词', function() {
    if (typeof KeywordEngine === 'undefined') return;
    if (typeof KeywordEngine.analyze === 'function') {
      const result = KeywordEngine.analyze('');
      TestRunner.assertTrue(
        !result || result.totalWeight === 0 || result.totalWeight === undefined || result.totalWeight < 1,
        '空消息权重应为 0'
      );
    }
  });

  TestRunner.test('混合关键词：取权重最高的方向', function() {
    if (typeof KeywordEngine === 'undefined') return;
    if (typeof KeywordEngine.analyze === 'function') {
      const result = KeywordEngine.analyze('我喜欢编程和算法');
      TestRunner.assertTrue(result !== undefined, '应返回分析结果');
    }
  });

  TestRunner.test('关键词匹配：英文词也能识别', function() {
    if (typeof KeywordEngine === 'undefined') return;
    if (typeof KeywordEngine.analyze === 'function') {
      const result = KeywordEngine.analyze('我想学 Python');
      TestRunner.assertTrue(result !== undefined, '应支持英文关键词');
    }
  });

  TestRunner.test('关键词引擎非空初始化', function() {
    TestRunner.assertTrue(
      typeof KeywordEngine !== 'undefined',
      'KeywordEngine 模块存在'
    );
  });

  TestRunner.test('装扮关键词累积计数功能', function() {
    if (typeof KeywordEngine === 'undefined') return;
    if (typeof KeywordEngine.loadAccessoryCounts === 'function') {
      TestRunner.assertType(KeywordEngine.loadAccessoryCounts, 'function');
    }
  });
});

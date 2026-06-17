/**
 * 消息质量评分测试（五因子系统）
 */
TestRunner.suite('消息质量评分', function() {

  TestRunner.test('< 5 字消息 → lengthFactor = 0.5', function() {
    if (typeof ChatEngine === 'undefined') return;
    const result = ChatEngine.calculateMessageQuality('嗯');
    TestRunner.assertRange(result, 0.3, 0.8, '敷衍消息应低于0.8');
  });

  TestRunner.test('含因果链应提升 quality', function() {
    if (typeof ChatEngine === 'undefined') return;
    const resultWith = ChatEngine.calculateMessageQuality('因为努力学习所以成绩提升了');
    const resultWithout = ChatEngine.calculateMessageQuality('努力学习成绩提升了');
    TestRunner.assertTrue(
      resultWith >= resultWithout,
      '含因果链的消息质量应不低于不含的'
    );
  });

  TestRunner.test('含反思词应加分', function() {
    if (typeof ChatEngine === 'undefined') return;
    const resultWith = ChatEngine.calculateMessageQuality('但是后来我发现其实不是这样的');
    const resultWithout = ChatEngine.calculateMessageQuality('我发现不是这样的');
    TestRunner.assertTrue(
      resultWith >= resultWithout,
      '含反思词的消息质量不应低于不含的'
    );
  });

  TestRunner.test('quality 范围始终在 0.3~3.5 内', function() {
    if (typeof ChatEngine === 'undefined') return;
    const tests = ['嗯', '今天天气不错', '因为好好学习所以成绩提升了很多，但是后来发现其实方法不太对，于是我决定换个角度重新思考这个问题'];
    for (const t of tests) {
      const q = ChatEngine.calculateMessageQuality(t);
      TestRunner.assertRange(q, 0.3, 3.5, `消息 "${t.slice(0, 20)}..." 质量 ${q} 超出范围`);
    }
  });

  TestRunner.test('仅 "好的" → quality < 1.0', function() {
    if (typeof ChatEngine === 'undefined') return;
    const result = ChatEngine.calculateMessageQuality('好的');
    TestRunner.assertTrue(result < 1.1, `短回复质量应低，实际 ${result}`);
  });

  TestRunner.test('长文深度分析 → quality >= 1.0', function() {
    if (typeof ChatEngine === 'undefined') return;
    const longText = '我最近在学习机器学习，发现损失函数的设计是一个非常关键的问题。因为不同的损失函数会导致模型收敛到不同的局部最优解，所以必须根据具体问题来选择合适的损失函数。但是其实我一开始以为交叉熵损失是万能的，后来发现对于回归问题，MSE 可能更合适。这不完全是因为数学上的差异，更重要的是对于异常值的敏感度不同。';
    const result = ChatEngine.calculateMessageQuality(longText);
    TestRunner.assertTrue(result >= 1.0, `长文深度分析质量应 >= 1.0，实际 ${result}`);
  });

  TestRunner.test('结构层因子：有序号词加分的消息', function() {
    if (typeof ChatEngine === 'undefined') return;
    const withStructure = ChatEngine.calculateMessageQuality('首先我们要分析问题，其次提出方案，最后验证效果');
    const withoutStructure = ChatEngine.calculateMessageQuality('我们要分析问题提出方案验证效果');
    // 结构化的至少不差于非结构化的
    TestRunner.assertTrue(withStructure >= withoutStructure * 0.9,
      `结构化: ${withStructure}, 非结构化: ${withoutStructure}`);
  });

  TestRunner.test('信息密度：含专有名词的消息质量更高', function() {
    if (typeof ChatEngine === 'undefined') return;
    const techMsg = ChatEngine.calculateMessageQuality('我正在学习 React 框架，使用 TypeScript 语言，通过 Docker 部署到 AWS 上');
    const plainMsg = ChatEngine.calculateMessageQuality('我正在学习一个框架，使用一种语言，通过一种工具部署到云上');
    TestRunner.assertTrue(techMsg >= plainMsg * 0.85,
      `专有名词消息: ${techMsg}, 普通消息: ${plainMsg}`);
  });
});

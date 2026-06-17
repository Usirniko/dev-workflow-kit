/**
 * 离线问答库测试
 */
TestRunner.suite('离线问答库', function() {

  TestRunner.test('OfflineQA 模块存在', function() {
    TestRunner.assertTrue(typeof OfflineQA !== 'undefined', 'OfflineQA 模块应已加载');
  });

  TestRunner.test('问答库非空', function() {
    if (typeof OfflineQA === 'undefined') return;
    TestRunner.assertTrue(
      OfflineQA.QA_DATABASE && OfflineQA.QA_DATABASE.length > 0,
      '问答库应包含条目'
    );
  });

  TestRunner.test('"你是谁" 能匹配到问答', function() {
    if (typeof OfflineQA === 'undefined') return;
    if (typeof OfflineQA.match === 'function') {
      const result = OfflineQA.match('你是谁', 'freshman');
      TestRunner.assertTrue(
        result !== null && result !== undefined,
        '应匹配到离线回答'
      );
    }
  });

  TestRunner.test('"今天天气真好" 不应匹配', function() {
    if (typeof OfflineQA === 'undefined') return;
    if (typeof OfflineQA.match === 'function') {
      const result = OfflineQA.match('今天天气真好', 'freshman');
      // 可能返回 null 或 score < 阈值
      const isNoMatch = result === null || result === undefined;
      TestRunner.assertTrue(isNoMatch, '无关消息不应匹配');
    }
  });

  TestRunner.test('问答库无重复问题', function() {
    if (typeof OfflineQA === 'undefined') return;
    if (!OfflineQA.QA_DATABASE) return;

    const questions = OfflineQA.QA_DATABASE.map(qa => qa.q);
    const unique = [...new Set(questions)];
    TestRunner.assertEqual(
      questions.length, unique.length,
      '问答库中不应有重复问题'
    );
  });

  TestRunner.test('每个问答包含必要字段', function() {
    if (typeof OfflineQA === 'undefined') return;
    if (!OfflineQA.QA_DATABASE) return;

    for (let i = 0; i < OfflineQA.QA_DATABASE.length; i++) {
      const qa = OfflineQA.QA_DATABASE[i];
      TestRunner.assertNotEmpty(qa.q, `第 ${i + 1} 条缺少问题`);
      TestRunner.assertNotEmpty(qa.a, `第 ${i + 1} 条缺少回答`);
    }
  });
});

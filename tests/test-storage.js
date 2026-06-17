/**
 * 存储模块测试
 */
TestRunner.suite('存储模块', function() {

  TestRunner.test('Storage 模块存在', function() {
    TestRunner.assertTrue(typeof Storage !== 'undefined', 'Storage 模块应已加载');
  });

  TestRunner.test('localStorage 可用', function() {
    TestRunner.assertTrue(typeof localStorage !== 'undefined', 'localStorage 应可用');
  });

  TestRunner.test('Storage.saveAll / loadAll 往返一致', function() {
    if (typeof Storage === 'undefined') return;

    const testData = {
      penguinData: { name: '测试企鹅', consecutiveDays: 5 },
      chatHistory: { messages: [{ role: 'user', content: '测试消息' }] },
      userConfig: { grade: 'freshman', apiKey: '' },
      appState: { currentPage: 'egg' }
    };

    // 备份原数据
    const orgData = Storage.loadAll();

    try {
      Storage.saveAll(testData.penguinData, testData.chatHistory, testData.userConfig, testData.appState);
      const loaded = Storage.loadAll();

      TestRunner.assertTrue(loaded !== null, '应成功加载数据');
      TestRunner.assertTrue(loaded.penguinData !== undefined, '应有 penguinData');
      TestRunner.assertEqual(loaded.penguinData.name, '测试企鹅', '企鹅名称应一致');
    } finally {
      // 恢复原数据
      if (orgData && orgData.penguinData) {
        Storage.saveAll(orgData.penguinData, orgData.chatHistory, orgData.userConfig, orgData.appState);
      }
    }
  });

  TestRunner.test('空数据加载不抛异常', function() {
    if (typeof Storage === 'undefined') return;
    if (typeof Storage.loadAll === 'function') {
      const result = Storage.loadAll();
      // 可能返回 null 或默认结构
      TestRunner.assertTrue(result === null || typeof result === 'object', '应返回 null 或对象');
    }
  });
});

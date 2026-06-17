/**
 * 应用状态管理测试
 */
TestRunner.suite('应用状态管理', function() {

  TestRunner.test('App 对象存在', function() {
    TestRunner.assertTrue(typeof App !== 'undefined', 'App 应已加载');
  });

  TestRunner.test('getDefaultPenguinData 返回完整数据', function() {
    if (typeof App === 'undefined') return;
    const data = App.getDefaultPenguinData();
    TestRunner.assertNotEmpty(data.name, '企鹅应有默认名称');
    TestRunner.assertType(data.attributes, 'object', 'attributes 应为对象');
    TestRunner.assertTrue(data.consecutiveDays !== undefined, '应有 consecutiveDays');
    TestRunner.assertTrue(data.lastLoginDate !== undefined, '应有 lastLoginDate');
  });

  TestRunner.test('getDefaultUserConfig 返回正确默认值', function() {
    if (typeof App === 'undefined') return;
    const config = App.getDefaultUserConfig();
    TestRunner.assertTrue(config.isFirstVisit === true, 'isFirstVisit 默认为 true');
    TestRunner.assertEqual(config.theme, 'light', '默认主题为 light');
    TestRunner.assertEqual(config.apiKey, '', '默认 API Key 为空');
  });

  TestRunner.test('getDefaultAppState 返回正确初始状态', function() {
    if (typeof App === 'undefined') return;
    const state = App.getDefaultAppState();
    TestRunner.assertEqual(state.currentPage, 'egg', '初始页面为 egg');
    TestRunner.assertEqual(state.isLoading, false, 'isLoading 初始为 false');
    TestRunner.assertEqual(state.currentTab, 'chat', '初始 Tab 为 chat');
  });

  TestRunner.test('updateConsecutiveDays 可正常调用', function() {
    if (typeof App === 'undefined') return;
    TestRunner.assertType(typeof App.updateConsecutiveDays, 'function', '应为函数');
  });
});

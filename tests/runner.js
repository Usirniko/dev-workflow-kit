/**
 * 企鹅测试运行器 v1.0
 * 轻量级浏览器内测试框架，零 npm 依赖
 */
const TestRunner = {
  suites: [],
  currentSuite: null,
  stats: { total: 0, passed: 0, failed: 0, skipped: 0 },

  /** 测试套件 */
  suite(name, fn) {
    this.currentSuite = { name, tests: [], passed: 0, failed: 0 };
    this.suites.push(this.currentSuite);
    fn();
  },

  /** 单个测试用例 */
  test(name, fn) {
    if (!this.currentSuite) {
      console.warn('test() must be inside suite()');
      return;
    }
    this.currentSuite.tests.push({ name, fn });
  },

  /** 跳过测试 */
  skip(name, fn) {
    this.stats.skipped++;
  },

  /** 断言 */
  assertEqual(actual, expected, msg) {
    const pass = actual === expected;
    if (!pass) {
      throw new Error(msg || `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
    }
  },

  assertTrue(cond, msg) {
    if (!cond) throw new Error(msg || '断言失败：期望为真');
  },

  assertFalse(cond, msg) {
    if (cond) throw new Error(msg || '断言失败：期望为假');
  },

  assertRange(val, min, max, msg) {
    if (val < min || val > max) {
      throw new Error(msg || `值 ${val} 不在范围 [${min}, ${max}] 内`);
    }
  },

  assertType(val, type, msg) {
    const actual = typeof val;
    if (actual !== type) {
      throw new Error(msg || `期望类型 ${type}，实际 ${actual}`);
    }
  },

  assertNotEmpty(val, msg) {
    if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && val.trim() === '')) {
      throw new Error(msg || '断言失败：期望非空');
    }
  },

  assertContains(str, substr, msg) {
    if (!str.includes(substr)) {
      throw new Error(msg || `期望 "${str}" 包含 "${substr}"`);
    }
  },

  /** 运行所有测试 */
  async run() {
    console.log('%c🐧 企鹅测试框架 v1.0', 'font-size:18px;font-weight:bold;color:#0052D9;');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const suite of this.suites) {
      console.log(`\n%c📋 ${suite.name}`, 'font-size:15px;font-weight:bold;color:#333;');
      const suiteEl = document.getElementById(`suite-${this._slugify(suite.name)}`);

      for (const test of suite.tests) {
        this.stats.total++;
        try {
          const result = test.fn();
          if (result instanceof Promise) {
            await result;
          }
          this.stats.passed++;
          suite.passed++;
          console.log(`  %c✓%c ${test.name}`, 'color:#00A870;', 'color:#333;');
          this._updateTestUI(suite, test, true);
        } catch (e) {
          this.stats.failed++;
          suite.failed++;
          console.error(`  %c✗%c ${test.name}`, 'color:#E34D59;', 'color:#333;');
          console.error(`    ${e.message}`);
          this._updateTestUI(suite, test, false, e.message);
        }
      }
    }

    this._renderSummary();
    return this.stats;
  },

  /** 渲染 UI 报告 */
  _renderSummary() {
    const el = document.getElementById('test-summary');
    if (!el) return;

    const { total, passed, failed, skipped } = this.stats;
    const rate = total > 0 ? Math.round(passed / total * 100) : 100;
    const color = rate >= 90 ? '#00A870' : rate >= 70 ? '#ED7B2F' : '#E34D59';

    el.innerHTML = `
      <div class="test-summary-card" style="border-color:${color}">
        <div class="test-summary-icon">${rate === 100 ? '🏆' : rate >= 90 ? '✅' : '⚠️'}</div>
        <div class="test-summary-rate" style="color:${color}">${rate}%</div>
        <div class="test-summary-detail">
          共 ${total} 条 | 通过 ${passed} | 失败 ${failed} | 跳过 ${skipped}
        </div>
      </div>
    `;
  },

  _updateTestUI(suite, test, passed, error) {
    // 更新套件统计
    const suiteId = `suite-${this._slugify(suite.name)}`;
    const suiteEl = document.getElementById(suiteId);
    if (suiteEl) {
      const badge = suiteEl.querySelector('.suite-badge');
      if (badge) {
        badge.textContent = `${suite.passed}/${suite.tests.length}`;
        badge.style.background = suite.passed === suite.tests.length ? '#ecfdf5' : '#fef2f2';
        badge.style.color = suite.passed === suite.tests.length ? '#065f46' : '#991b1b';
      }
    }

    // 添加测试项
    const listId = `list-${this._slugify(suite.name)}`;
    const listEl = document.getElementById(listId);
    if (listEl) {
      const item = document.createElement('div');
      item.className = `test-item ${passed ? 'test-pass' : 'test-fail'}`;
      item.innerHTML = `
        <span class="test-icon">${passed ? '✓' : '✗'}</span>
        <span class="test-name">${test.name}</span>
        ${!passed ? `<span class="test-error">${error || '失败'}</span>` : ''}
      `;
      listEl.appendChild(item);
    }
  },

  /** 初始化 UI */
  initUI() {
    const app = document.getElementById('test-app');
    if (!app) return;

    let html = '<h1>🐧 企鹅测试报告</h1><div id="test-summary"></div><div class="test-suites">';

    for (const suite of this.suites) {
      const id = this._slugify(suite.name);
      html += `
        <div class="test-suite" id="suite-${id}">
          <div class="suite-header">
            <span class="suite-title">📋 ${suite.name}</span>
            <span class="suite-badge">0/${suite.tests.length}</span>
          </div>
          <div class="suite-list" id="list-${id}"></div>
        </div>
      `;
    }

    html += '</div>';
    app.innerHTML = html;
  },

  _slugify(name) {
    return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
};

/**
 * 缓存破坏构建脚本 (v2 - idempotent)
 * 
 * 分两阶段：
 *   阶段1 - 自动清理：删除旧哈希文件、还原 index.html 为纯净引用
 *   阶段2 - 构建：计算新哈希、生成带哈希文件、更新 HTML 引用
 * 
 * 因此无论运行多少次都不会产生双重哈希。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILE = path.join(ROOT, 'index.html');

// 计算文件 SHA256 哈希（前 8 个十六进制字符）
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}

// ============ 阶段 1：清理 ============
console.log('🧹 阶段 1: 清理旧哈希文件...');

// 删除 js/ css/ 下所有带哈希的文件
['js', 'css'].forEach(dir => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(file => {
    // 匹配 name.HASH.ext 或 name.HASH.HASH.ext
    if (/\.([0-9a-f]{8})(\.([0-9a-f]{8}))?\.\w+$/.test(file)) {
      fs.unlinkSync(path.join(d, file));
      console.log(`  🗑️  ${dir}/${file}`);
    }
  });
});

// 还原 index.html 所有引用为纯净文件名
let html = fs.readFileSync(HTML_FILE, 'utf-8');

// 匹配 js/xxx.js 或 js/xxx.HASH.js 或 js/xxx.HASH.HASH.js
// 匹配 css/xxx.css 或 css/xxx.HASH.css 或 css/xxx.HASH.HASH.css
html = html.replace(
  /(src|href)="((?:js|css)\/[^"]+)"/g,
  (full, attr, filepath) => {
    // 移除所有 .HASH 层级，保留扩展名
    // e.g. "js/theme.117d26f1.abc12345.js" → "js/theme.js"
    const cleaned = filepath.replace(/\.[0-9a-f]{8}/g, '');
    return `${attr}="${cleaned}"`;
  }
);

fs.writeFileSync(HTML_FILE, html, 'utf-8');
console.log('  ✅ index.html 引用已还原\n');

// ============ 阶段 2：构建 ============
console.log('🔨 阶段 2: 缓存破坏构建...\n');

// 重新读取清洁后的 HTML
html = fs.readFileSync(HTML_FILE, 'utf-8');

// 匹配所有本地 JS 引用
const jsRegex = /src="(js\/[^"]+\.js)"/g;
const cssRegex = /href="(css\/[^"]+\.css)"/g;

const filesToProcess = [];
let match;

while ((match = jsRegex.exec(html)) !== null) {
  const relPath = match[1];
  const absPath = path.join(ROOT, relPath);
  if (fs.existsSync(absPath)) {
    filesToProcess.push({ type: 'js', relPath, absPath, pattern: match[0], matchPath: match[1] });
  } else {
    console.log(`  ⚠️  跳过不存在的文件: ${relPath}`);
  }
}

while ((match = cssRegex.exec(html)) !== null) {
  const relPath = match[1];
  const absPath = path.join(ROOT, relPath);
  if (fs.existsSync(absPath)) {
    filesToProcess.push({ type: 'css', relPath, absPath, pattern: match[0], matchPath: match[1] });
  }
}

console.log(`📦 找到 ${filesToProcess.length} 个资源文件\n`);

const hashMap = {};

for (const file of filesToProcess) {
  const hash = hashFile(file.absPath);
  const dir = path.dirname(file.relPath);
  const ext = path.extname(file.relPath);
  const basename = path.basename(file.relPath, ext);
  const newName = `${basename}.${hash}${ext}`;
  const newRelPath = path.join(dir, newName).replace(/\\/g, '/');
  const newAbsPath = path.join(ROOT, newRelPath);

  hashMap[file.relPath] = { hash, newRelPath, newAbsPath };
  console.log(`   ${file.relPath}  →  ${newRelPath}  [${hash}]`);

  fs.copyFileSync(file.absPath, newAbsPath);
}

console.log(`\n📝 更新 index.html 引用...`);

for (const file of filesToProcess) {
  const info = hashMap[file.relPath];
  html = html.replace(file.matchPath, info.newRelPath);
}

// 清除旧构建注释，添加新注释
html = html.replace(/<!--.*缓存破坏.*-->\n?/g, '');
const buildTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
html = html.replace(
  '</title>',
  `</title>\n  <!-- 🏗️ 缓存破坏构建: ${buildTime} -->`
);

fs.writeFileSync(HTML_FILE, html, 'utf-8');
console.log('✅ index.html 已更新\n');

console.log('📋 构建摘要:');
console.log(`   JS 文件: ${filesToProcess.filter(f => f.type === 'js').length} 个`);
console.log(`   CSS 文件: ${filesToProcess.filter(f => f.type === 'css').length} 个`);
console.log(`   构建时间: ${buildTime}`);
console.log('\n🎉 缓存破坏构建完成！');
console.log('   现在可以部署到云端。\n');

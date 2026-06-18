# Dev Workflow — 通用开发流程方法论

> 一套结构化的五阶段开发流程，让 AI 编码助手在任何工具中都能遵循最佳实践。
> 核心亮点：**编码前 16 个发现性问题**，避免需求返工。

---

## 支持的工具

| 工具 | 文件 | 放置位置 |
|------|------|---------|
| **Cursor** | `cursor/.cursorrules` | 项目根目录 |
| **GitHub Copilot / Codex** | `codex/copilot-instructions.md` | `.github/` 目录下 |
| **Windsurf** | `windsurf/.windsurfrules` | 项目根目录 |
| **IMA / cuser / 其他工具** | `system-prompt.md` | 粘贴到工具的「自定义指令/系统提示词」设置中 |

---

## 快速开始

### Cursor

```bash
cp dev-workflow-universal/cursor/.cursorrules 你的项目/.cursorrules
```

### GitHub Copilot / Codex

```bash
mkdir -p 你的项目/.github
cp dev-workflow-universal/codex/copilot-instructions.md 你的项目/.github/copilot-instructions.md
```

### Windsurf

```bash
cp dev-workflow-universal/windsurf/.windsurfrules 你的项目/.windsurfrules
```

### IMA / cuser / 其他

打开 `system-prompt.md`，全选复制，粘贴到工具的「系统提示词」或「自定义指令」设置框中。

---

## 方法论内容概览

| 阶段 | 内容 |
|------|------|
| **Phase 0** | 项目前期探测 — 4 轮 16 个发现性问题（基础→功能+界面→技术→边界） |
| **Phase 1** | 需求文档 — PRD、数据结构、算法伪代码、视觉规范 |
| **Phase 2** | 技术选型与架构 — 技术栈决策、模块关系图、状态管理、持久化策略 |
| **Phase 3** | 编码实现 — 7 步实施顺序、编码原则、防御性编程 |
| **Phase 4** | 测试与修复 — 功能测试、代码审查清单、常见陷阱表 |
| **Phase 5** | 上线发布 — 项目清理、Git 工作流、CDN 缓存策略 |

---

## 版本

- `v1.2` — 2026-06-18：提问优化（一次一问+编号选项）、每个阶段自动生成 MD 文档（共 13 份）、文档交付规则（对话中只做简短总结）
- `v1.1` — 2026-06-17：新增界面规划问题（Q8-Q9），支持多工具格式
- `v1.0` — 2026-06-17：初始版本

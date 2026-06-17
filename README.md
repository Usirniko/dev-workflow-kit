# Dev Workflow Kit

> 让 AI 帮你写代码时不再瞎猜。这套方法论会教 AI 在动手前先问你 16 个关键问题，把需求聊清楚了再开工。然后按五个阶段一步步推进，从想法到上线全都有章可循。

## 支持的工具

| 工具 | 使用方式 |
|------|---------|
| **Cursor** | 将 `通用技能/cursor/.cursorrules` 复制到项目根目录 |
| **GitHub Copilot / Codex** | 将 `通用技能/codex/copilot-instructions.md` 复制到 `.github/` 目录 |
| **Windsurf** | 将 `通用技能/windsurf/.windsurfrules` 复制到项目根目录 |
| **IMA / cuser / 其他** | 打开 `通用技能/system-prompt.md`，全文复制粘贴到自定义指令设置 |
| **CodeBuddy** | 已内置在 `.codebuddy/skills/dev-workflow/` 中，自动生效 |

## 方法论内容

### Phase 0：项目前期探测（动手前必问）

4 轮 16 个问题，帮你把需求聊透再写代码：

- **Round 1**：这是什么项目？给谁用？有没有参考？
- **Round 2**：核心功能有哪些？要不要登录？数据存哪？有哪些界面？界面怎么跳转？
- **Round 3**：用什么技术栈？偏什么设计风格？有什么平台限制？
- **Round 4**：出错了怎么办？要不要多语言？接不接第三方服务？

### Phase 1-5：全链路开发

| 阶段 | 做什么 |
|------|--------|
| Phase 1 需求 | PRD、数据结构、算法伪代码、视觉规范 |
| Phase 2 技术选型 | 技术栈决策、架构图、状态管理、持久化方案 |
| Phase 3 编码实现 | 7 步实施顺序 + 编码原则 + 防御性编程 |
| Phase 4 测试修复 | 功能测试、代码审查清单、5 个常见陷阱 |
| Phase 5 上线发布 | 项目清理、Git 工作流、CDN 缓存策略 |

## 仓库结构

```
├── .codebuddy/skills/dev-workflow/   # CodeBuddy 原生 Skill（自动生效）
│   ├── SKILL.md
│   └── references/workflow-guide.md  # 方法论全文
├── 通用技能/                           # 🌟 所有工具的技能文件（统一入口）
│   ├── README.md                      # 各工具使用说明
│   ├── 项目开发流程总结.md              # 方法论中文总结
│   ├── system-prompt.md               # 通用版，粘贴到任意工具
│   ├── cursor/.cursorrules
│   ├── codex/copilot-instructions.md
│   ├── windsurf/.windsurfrules
│   └── codebuddy/                     # CodeBuddy 技能文件副本
└── README.md
```

## 快速开始

```bash
# Cursor 用户
cp 通用技能/cursor/.cursorrules 你的项目/

# Copilot 用户
mkdir -p 你的项目/.github
cp 通用技能/codex/copilot-instructions.md 你的项目/.github/

# Windsurf 用户
cp 通用技能/windsurf/.windsurfrules 你的项目/
```

之后只要在 `通用技能/` 中找到适合你工具的文件夹，复制对应文件到项目根目录即可。

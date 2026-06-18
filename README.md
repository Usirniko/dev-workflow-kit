# Dev Workflow Kit

> 让 AI 帮你写代码时不再瞎猜。这套方法论会教 AI 在动手前先问你 16 个关键问题，把需求聊清楚了再开工。然后按五个阶段一步步推进，从想法到上线全都有章可循。支持 CodeBuddy、Cursor、Copilot、Windsurf、Trae、IMA 等主流 AI 编程助手。

---

## 这个项目解决什么问题？

用 AI 写代码最怕什么？**还没聊清楚需求，AI 就开始咔咔写**，结果写出来的东西和你想的完全不一样，反复改来改去浪费大量时间。

这套方法论就像一个"AI 编程的说明书"——把它装到你的 AI 工具里，AI 就会**先问够问题、再动手写代码**，避免返工。

---

## 怎么用？

### 第 1 步：找到适合你的文件

根据你用的工具选择对应的文件：

| 你用的工具 | 文件夹 | 文件 | 放到哪里 |
|-----------|--------|------|---------|
| Cursor | `cursor/` | `.cursorrules` | 项目根目录 |
| GitHub Copilot | `codex/` | `copilot-instructions.md` | `.github/copilot-instructions.md` |
| Windsurf | `windsurf/` | `.windsurfrules` | 项目根目录 |
| Trae | `trae/` | `.trae/rules/dev-workflow.md` | 项目根目录（直接复制整个 `.trae/` 文件夹） |
| CodeBuddy | `codebuddy/` | `SKILL.md` | `.codebuddy/skills/dev-workflow/` |
| IMA、cuser 等 | — | `system-prompt.md` | 粘贴到「自定义指令」中 |

### 第 2 步：放到项目中

**Cursor 用户**：把 `.cursorrules` 复制到你的项目根目录。

```
你的项目/
├── .cursorrules    ← 把这个文件放进来
├── index.html
└── ...
```

**GitHub Copilot 用户**：在项目根目录创建 `.github/` 文件夹，把 `copilot-instructions.md` 放进去。

```
你的项目/
└── .github/
    └── copilot-instructions.md    ← 放这里
```

**Windsurf 用户**：把 `.windsurfrules` 复制到项目根目录。

**Trae 用户**：把整个 `.trae/` 文件夹复制到项目根目录。

```
你的项目/
└── .trae/
    └── rules/
        └── dev-workflow.md    ← 放这里
```

**CodeBuddy 用户**：把 `codebuddy/` 文件夹的内容复制到项目的 `.codebuddy/skills/dev-workflow/` 下。

```
你的项目/
└── .codebuddy/
    └── skills/
        └── dev-workflow/
            ├── SKILL.md              ← 放这里
            └── references/
                └── workflow-guide.md ← 放这里
```

**IMA / cuser / 通用工具**：打开 `system-prompt.md`，全选复制，粘贴到工具的「自定义指令」或「系统提示词」设置里。

> ⚠️ 放好后**关闭 AI 对话窗口再重新打开**，让新规则生效。

### 第 3 步：正常开始对话

放好文件后，像平时一样跟 AI 对话就行。当你说"帮我做一个 xxx"时，AI 会自动先按流程问你关键问题，而不是直接写代码。

### 会用起来是什么感觉？

比如你说「帮我做个记账应用」，AI 不会直接开始写代码，而是会这样引导你：

> 好的，我先问几个问题理清需求：
> 1. 这个应用给谁用？一个人用还是多人共用？
> 2. 需要记录哪些类型的账目？
> 3. 数据需要长期保存吗？存本地还是云端？
> ...

等你回答了这些问题，AI 才会进入下一步——出需求文档、设计界面、写代码。

---

## 五个阶段做什么？

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| **Phase 0** 需求探测 | 4 轮 16 个问题，聊透再开工 | 明确的需求清单 |
| **Phase 1** 需求文档 | PRD、数据结构、界面规划 | 产品需求文档 |
| **Phase 2** 技术选型 | 技术栈、架构、状态管理 | 技术方案 |
| **Phase 3** 编码实现 | 7 步实施顺序 + 编码原则 | 可运行的代码 |
| **Phase 4** 测试修复 | 功能测试、代码审查、常见陷阱 | 稳定的产品 |
| **Phase 5** 上线发布 | 清理、Git 工作流、部署 | 线上可访问 |

---

## 仓库有什么？

```
├── cursor/.cursorrules                # Cursor 规则
├── codex/copilot-instructions.md      # Copilot 规则
├── windsurf/.windsurfrules            # Windsurf 规则
├── trae/.trae/rules/dev-workflow.md   # Trae 规则
├── codebuddy/                         # CodeBuddy Skill
│   ├── SKILL.md
│   └── references/workflow-guide.md
├── system-prompt.md                   # 通用版（粘贴即可）
├── 项目开发流程总结.md                  # 方法论中文详解
└── README.md                          # 你现在看的这个文件
```

---

## 常见问题

**Q：我同时用多个 AI 工具怎么办？**  
每个项目放对应的文件就行，互不影响。比如 Cursor 项目放 `.cursorrules`，Copilot 项目放 `copilot-instructions.md`。

**Q：用了之后 AI 会不会变得很啰嗦？**  
前期会多问几句，但这些问题都是**本来你就得想清楚的**。聊透了再写，反而更快。

**Q：能用在非前端项目吗？**  
可以。方法论的核心是「先想清楚再动手」，后端、脚本、小程序都适用。

**Q：怎么确认规则生效了？**  
新开对话后，跟 AI 说「帮我做个 xxx」，看它会不会先问你问题而不是直接写代码。

---

## 版本

- `v1.3` — 2026-06-18：整理仓库结构，删除无关文件（CloudBase 规则等），同步 CodeBuddy Skill 到最新版，新增 `.gitignore`
- `v1.2` — 2026-06-18：提问优化（一次一问+编号选项）、每个阶段自动生成 MD 文档（共 13 份）、文档交付规则
- `v1.1` — 2026-06-17：新增界面规划问题（Q8-Q9），支持多工具格式
- `v1.0` — 2026-06-17：初始版本

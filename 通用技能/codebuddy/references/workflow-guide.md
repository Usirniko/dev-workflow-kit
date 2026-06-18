# Project Development Workflow Guide

> A structured five-phase methodology for building frontend web applications, mini-games,
> single-file tools, and prototypes. Applicable to HTML/CSS/JS projects of any scale.

## Document Delivery Rule — READ THIS FIRST

When generating MD documents at each phase:
- **Write the complete document content to the file** using the write tool
- **Do NOT paste the full document content in chat.** Instead, tell the user a short
  2-3 sentence plain-language summary: what this doc covers and what it's for.
  This keeps the conversation readable and fast-moving.
- Ask the user if they want to review details or move on

---

## Phase 0: Pre-Project Discovery

> Do NOT skip this phase. Ask questions before writing any code, even if the user's
> request seems detailed. Early clarification prevents costly rework later.

### Principle

**Ask exactly ONE question at a time. Wait for the user's response before asking the next
question.** NEVER batch multiple questions together in a single message, even if they
belong to the same round. Start with the most critical question, then follow up based on
the response.

**Always provide numbered options** when the question has a limited set of reasonable
answers. The user can reply with just a number or type their own answer. This reduces
typing friction and makes the conversation flow faster.

Example:
> 视觉风格你喜欢哪种？
> 1. 像素复古风（推荐）
> 2. 极简扁平风
> 3. 你有其他想法吗？

For open-ended questions with no natural options (e.g., "用一两句话描述你的项目"),
ask plainly without options.

This one-at-a-time + numbered-option approach:
- Creates a natural conversational rhythm
- Prevents the user from feeling overwhelmed
- Allows each answer to inform and refine the next question
- Leads to more thoughtful, higher-quality responses

### Round 1: Project Basics (ask first)

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What is the project? Describe it in one or two sentences. | Establishes scope and core purpose |
| 2 | Who is the target user, and what problem does this solve for them? | Drives UX decisions and feature priority |
| 3 | Is there an existing reference, competitor, or inspiration? If so, what do you like/dislike about it? | Speeds up design alignment |

### Round 2: Scope and Features (ask after Round 1 responses)

| # | Question | Why It Matters |
|---|----------|----------------|
| 4 | What are the 2-4 must-have features? What can wait for later versions? | Prevents scope creep; defines MVP |
| 5 | Will users need to create accounts or log in? | Determines auth complexity |
| 6 | Does any data need to persist across sessions or devices? | Determines storage strategy (localStorage vs. database vs. cloud) |
| 7 | What is the expected usage scale? (single-user, small group, public) | Impacts architecture and performance planning |
| 8 | What screens/pages will the app have? List every distinct view the user will see. | Defines the page inventory; prerequisite for navigation design |
| 9 | How are these screens connected? Sketch the page hierarchy or navigation flow (e.g., home → detail, tabs, modals, onboarding steps). | Surfaces navigation patterns early; prevents orphan pages and dead ends |

> **Tip for questions 8-9:** If the user is unsure, offer to draft a simple page tree based on
> the features they described. Example output:
> ```
> Home (landing)
>  ├── Login / Sign Up
>  ├── Dashboard (tab bar: Feed, Search, Profile)
>  │   ├── Feed → Post Detail
>  │   ├── Search → Search Results
>  │   └── Profile → Settings
>  └── Onboarding Wizard (step 1 → step 2 → step 3)
> ```

### Round 3: Technical Preferences (ask based on context)

| # | Question | Why It Matters |
|---|----------|----------------|
| 10 | Any preference for tech stack? (pure HTML/CSS/JS, React, Vue, etc.) If unsure, state that. | Determines architecture and tooling |
| 11 | Any design preference? (minimalist, playful, professional, dark-mode, mobile-first) | Sets visual direction from the start |
| 12 | Any platform or browser constraints? (must work offline, mobile-only, WeChat Mini Program, etc.) | Identifies non-functional requirements early |
| 13 | Is there a preferred deployment target? (GitHub Pages, cloud platform, custom server) | Affects build and deploy pipeline |

### Round 4: Edge Cases and Special Requirements (ask as needed)

| # | Question | Why It Matters |
|---|----------|----------------|
| 14 | What should happen when things go wrong? (no network, API failure, empty data) | Defines error handling and fallback strategy |
| 15 | Does the project need multi-language support (i18n) or accessibility (a11y)? | Impacts component design from the start |
| 16 | Any third-party APIs or services needed? (AI, maps, payments, analytics) | Uncovers integration complexity early |

### When to Stop Asking

Stop asking and start building when:
- The user explicitly says "just start" or "I trust your judgment"
- You have enough clarity to define a Minimum Viable Product (MVP) scope
- You've gone through at least Rounds 1 and 2

If the user cannot answer some questions, make reasonable assumptions, state them
explicitly, and proceed. You can always iterate later.

### Phase 0 Deliverable

After completing the discovery questions, generate `docs/需求概述.md` summarizing:
- Project name and one-sentence description
- Target users and the problem being solved
- MVP scope (must-have features vs. nice-to-haves)
- Page/screen inventory with navigation flow
- Key technical constraints and preferences noted

**Save the file directly. In chat, give a 2-3 sentence summary.** Ask the user if they want
to review, then proceed to Phase 1.

---

## Phase 1: Requirements Documentation

### 1.1 Product Requirements Document (PRD)

Answer the following questions in writing:

- **Product positioning**: One sentence describing what this is
- **Target users**: Who uses it, in what context
- **Core feature modules**: Break down by scene/page, list key interactions for each module
- **Non-functional requirements**: Performance, platform constraints, offline/online behavior

### 1.2 Data Structure Design

- List all core data entities
- For each entity, define field names, types, and meanings
- Clarify relationships between entities (one-to-one, one-to-many)
- Include sample data in the document for direct copy-paste into code later

### 1.3 Algorithm and Rule Descriptions

- Document core computation logic in a dedicated section
- Use pseudocode or natural language to describe calculation steps
- Note edge cases and special handling

### 1.4 Visual Design Specification

- Color scheme (primary, secondary, background, text colors)
- Typography hierarchy (font families and sizes)
- Component style conventions (border radius, shadow, spacing for buttons, panels, modals)

### Phase 1 Deliverables

After completing Phase 1, generate these MD documents in the `docs/` folder:

1. **`docs/PRD.md`** — Product Requirements Document containing:
   - Product positioning and target users
   - Core feature modules with key interactions
   - Non-functional requirements

2. **`docs/数据结构设计.md`** — Data Structure Design containing:
   - All core data entities with field names, types, and meanings
   - Entity relationships diagram
   - Sample data for direct use in code

3. **`docs/UI设计规范.md`** — UI Design Specification containing:
   - Complete color scheme with hex codes
   - Typography hierarchy with specific font sizes
   - Component style conventions (buttons, cards, modals, inputs)

4. **`docs/大纲.md`** — Project Outline containing:
   - Full project structure overview
   - All pages/screens with their purpose
   - Implementation order plan

**Save each file directly. In chat, give a short summary per document (2-3 sentences each).**
Ask the user if they want to review any, then proceed to Phase 2.

---

## Phase 2: Technology Selection and Architecture

### 2.1 Technology Selection

Choose the appropriate stack based on requirements:

| Stack | When to Use | Typical Tools |
|-------|-------------|---------------|
| Pure frontend single-file | Lightweight, offline-capable | HTML + Canvas + Vanilla JS |
| Framework application | Complex interactions, routing | React / Vue + UI library |
| Full-stack application | Persistence, multi-user scenarios | Frontend + Backend + Database |

### 2.2 Architecture Design

- Draw a module relationship diagram
- Define the state management approach (global state structure)
- Define scene/route switching logic
- Decide on the persistence strategy (localStorage / IndexedDB / backend API / cloud platform)

### Phase 2 Deliverable

Generate two MD documents:

1. **`docs/技术架构.md`** containing:
   - Final tech stack selection with rationale
   - Module relationship diagram (text-based or Mermaid)
   - State management design (global state structure)
   - Scene/route switching logic
   - Persistence strategy with justification

2. **`docs/项目结构.md`** containing:
   - Complete directory tree with explanations for each folder/file
   - File naming conventions
   - Module responsibilities and boundaries
   - Entry point and build output descriptions

**Save each file directly. In chat, give a short summary per document.**
Ask if the user wants to review, then proceed to Phase 3.

---

## Phase 3: Implementation

### 3.1 Recommended Implementation Order

1. **Skeleton first** — Build HTML/CSS framework + Canvas initialization
2. **State management** — Define the global state object and scene-switching functions
3. **Data injection** — Convert documented data into JS constants
4. **Implement scene by scene** — Launch page → Main interface → Core gameplay → Results page
5. **Modals and auxiliary modules** — Settings, archives, tooltips, and other overlays
6. **Persistence** — Save/load logic
7. **Sound and animation** — Final polish

### 3.2 Coding Principles

- Each function has a single responsibility
- Modal components render independently and should not couple to specific scenes
- UI interactions use a unified registration mechanism — avoid scattered click handlers
- Separate data from logic: constants in configuration areas, logic in function areas
- **Defensive programming**: Wrap critical flows in `try-catch` to prevent single-point failures
  from freezing the entire page

### Phase 3 Deliverable

Generate two MD documents:

1. **`docs/开发日志.md`** — record as you implement:
   - Key implementation decisions and their reasons
   - Issues encountered and how they were resolved
   - Deviations from the original plan (if any)

2. **`docs/环境配置.md`** — development environment guide:
   - Required runtime versions (Node.js, npm/pnpm, etc.)
   - Dependency installation commands
   - Environment variables and their meanings
   - How to start the dev server / build for production
   - Common setup issues and solutions

Update `docs/开发日志.md` throughout the implementation phase. **Save files directly; summarize briefly in chat at each milestone.**

---

## Phase 4: Testing and Bug Fixing

### 4.1 Functional Testing

Run through the complete flow scene by scene:

- **Happy path**: Complete traversal of all pages
- **Error paths**: Failures, mid-session exits, save recovery
- **Edge cases**: Empty data, extreme values

### 4.2 Code Review Checklist

- Check for **JS syntax errors**
- Check for **Chinese quotation marks / special characters** (prone to issues in string concatenation)
- Search for **console.log / debugger** remnants
- Check for **duplicate IDs / duplicate invocations**
- Check for **dead code** (redundant logic left from previous modifications)
- Check for **page lifecycle traps**: auto-save on navigation/refresh may overwrite cleared data

### 4.3 Common Pitfalls

| Problem | Symptom | Prevention |
|---------|---------|------------|
| Modal-scene coupling | Closing a modal navigates to the wrong page | Modals render independently from scene state |
| Duplicate IDs | Later-registered buttons don't respond | Use unique IDs for every interactive element |
| State transition omissions | Previous scene UI lingers after switching | Clean up intermediate state on transitions |
| Auto-save write-back | Cleared data reappears after reset | Set a flag before reset; skip save when flag is set |
| CDN caching | Deployed page shows stale content | Append content hash to filenames; rebuild on each deploy |

### Phase 4 Deliverable

Generate `docs/测试报告.md` containing:
- All test cases executed (happy path, error paths, edge cases)
- Bugs found, their root causes, and how they were fixed
- Items checked from the code review checklist with results

**Save the file directly. In chat, summarize key findings in 2-3 sentences.**

---

## Phase 5: Launch

### 5.1 Project Cleanup

1. Add a `.gitignore` file (exclude local caches and editor configs)
2. Write a `README.md` (project introduction + quick start + documentation navigation)
3. Ensure all documentation is in sync with the code

### 5.2 Git and GitHub

```bash
git init                      # Initialize repository
git add -A                    # Stage all files
git commit -m "commit message" # First commit
git branch -M main            # Standardize branch name
git remote add origin <URL>   # Link remote repository
git push -u origin main       # Push to GitHub
```

### 5.3 Post-Launch Optional Steps

- Add repository description and topics (for discoverability)
- For deployable web apps: enable GitHub Pages or cloud static hosting
- For cloud-hosted apps: set up CDN cache-busting strategy

### Phase 5 Deliverables

Generate:

1. **`README.md`** — Project introduction, quick start guide, feature list, tech stack, documentation index linking to all `docs/` files
2. **`CHANGELOG.md`** — Version change log following Keep a Changelog format:
   - Version number and release date
   - Added / Changed / Fixed / Removed sections
   - Initial release notes for v1.0.0
3. **`.gitignore`** — Exclude local caches, editor configs, and environment-specific files
4. **`docs/部署文档.md`** — Deployment guide:
   - Build commands and output directory
   - Deployment target and steps (GitHub Pages / CloudBase / custom server)
   - CDN cache strategy
   - Domain and HTTPS setup (if applicable)
5. **`docs/常见问题.md`** — FAQ:
   - Development environment issues and solutions
   - Common build errors and fixes
   - Deployment troubleshooting
   - Known limitations and workarounds

**Save files directly. In chat, list what was generated with a one-line description each.**
Ensure all `docs/` files are up to date with the final implementation before launch.

---

## Quick Reference Flowchart

```
需求概述 → PRD + 大纲 + 数据设计 + UI规范
    ↓
技术选型 + 技术架构 + 项目结构
    ↓
骨架 → 状态管理 → 数据注入
    ↓
场景实现 → 模态框/辅助 → 持久化
    ↓  (同步产出：开发日志 + 环境配置)
全流程测试 → 代码审查 → Bug修复
    ↓  (产出：测试报告)
README + CHANGELOG + .gitignore + 部署文档 + 常见问题 → Git提交 → 发布
```

---

## Applicability

This workflow applies to:

- Single-file / lightweight web applications
- Mini-games and interactive tools
- Prototype validation projects
- Personal projects and demo showcases

Additional steps required for:

- Multi-person collaboration → branching strategy + code review process
- Backend service projects → API design + database migration + deployment operations
- Native mobile apps → platform adaptation + app store review

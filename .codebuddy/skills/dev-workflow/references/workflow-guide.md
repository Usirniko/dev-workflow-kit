# Project Development Workflow Guide

> A structured five-phase methodology for building frontend web applications, mini-games,
> single-file tools, and prototypes. Applicable to HTML/CSS/JS projects of any scale.

---

## Phase 0: Pre-Project Discovery

> Do NOT skip this phase. Ask questions before writing any code, even if the user's
> request seems detailed. Early clarification prevents costly rework later.

### Principle

**Ask no more than 3-4 questions at a time.** Start with the most critical questions,
then follow up based on responses. Use structured multiple-choice when possible to
reduce cognitive load.

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

---

## Quick Reference Flowchart

```
Requirements Doc → Data Design → Algorithm/Visual Specs
    ↓
Tech Selection + Architecture Design
    ↓
Skeleton → State Management → Data Injection
    ↓
Implement Scenes → Modals/Auxiliary → Persistence
    ↓
Full Flow Test → Code Review → Bug Fixes
    ↓
README + .gitignore → Git Commit → Push to Launch
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

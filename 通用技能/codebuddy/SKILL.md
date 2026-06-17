---
name: dev-workflow
description: >
  Provides a structured five-phase development workflow for building frontend web applications,
  mini-games, prototypes, and single-file tools. This skill should be used when the user asks to
  start a new project from scratch, requests guidance on the development process, wants to know
  the best order to implement features, or asks about project methodology, coding principles,
  testing checklists, or deployment workflows. Triggers include phrases like "build a new app",
  "create a project", "开发流程", "项目规划", "how should I implement this step by step",
  "coding workflow", "launch checklist", or any greenfield web project.
---

# Development Workflow

## Overview

Guide the user through a complete development lifecycle for lightweight frontend projects
(HTML + CSS + Vanilla JS, single-page apps, mini-games, prototypes). The methodology covers
five phases from requirements to launch, with emphasis on defensive coding, modular
architecture, and avoiding common pitfalls.

## When to Use This Skill

Trigger this skill when the user's request matches any of the following:

- Starting a new frontend project from an idea or specification
- Asking about the recommended order to build features
- Inquiring about project structure, coding principles, or testing strategies
- Requesting a launch/deployment checklist
- Asking in Chinese or English about 开发流程, 项目规划, 技术选型, 架构设计

## How to Use This Skill

### Step 1: Load the Full Guide

When triggered, read the bundled reference file for complete methodology details:

```
references/workflow-guide.md
```

This file contains the five-phase workflow with detailed sub-steps, checklists, and
trap-prevention tips. Keep it loaded as reference throughout the project.

### Step 2: Pre-Project Discovery (Always Do This First)

Before generating any code, ask the user a set of clarifying questions. This phase is
mandatory — do NOT skip it even if the user's request seems detailed. The questions help
surface hidden requirements and prevent rework later. For the complete question list,
see Phase 0 in `references/workflow-guide.md`.

Core principle: **ask no more than 3-4 questions at a time** to avoid overwhelming the
user. Start with the most critical questions, then follow up based on responses.

### Step 3: Assess the Project Stage

Determine which phase the user is in:

| If the user says... | Start at... |
|---------------------|-------------|
| "I have an idea for..." or "build me a..." | Phase 1: Requirements |
| "I have a design/spec" or "choose tech stack" | Phase 2: Architecture |
| "Let's start coding" or "implement this feature" | Phase 3: Implementation |
| "Test this" or "find bugs" | Phase 4: Testing |
| "Deploy" or "publish" or "go live" | Phase 5: Launch |

### Step 4: Apply the Methodology

Follow the workflow-guide.md through the relevant phases. Key principles to always enforce:

1. **Skeleton first** — HTML/CSS layout before any logic
2. **State early** — Define the data model and state management before rendering
3. **One scene at a time** — Implement each page/screen fully before moving to the next
4. **Overlays independent** — Modals, popups, and overlays should never couple to a specific scene
5. **Persistence last** — Save/load logic goes in after the core flow works
6. **Polish at the end** — Animations, sounds, and visual effects come after all features are stable

### Step 5: Use the Checklists

The guide includes actionable checklists that should be referenced at each phase:

- **Phase 0**: 16 discovery questions across 4 rounds (basics → features + screens → tech → edge cases)
- **Phase 1**: PRD completeness, data structure design, algorithm pseudocode
- **Phase 2**: Tech stack decision matrix, architecture diagram, persistence plan
- **Phase 3**: Implementation order (7 steps), coding principles
- **Phase 4**: Test path coverage, code review checklist (6 items), common trap table
- **Phase 5**: Pre-launch cleanup, Git workflow commands, CDN cache strategy

### Step 6: Adapt to the User's Stack

The methodology is stack-agnostic. When the user specifies a framework:

- **React/Vue**: Layer state management on top of the data model
- **CloudBase/CloudStudio**: Integrate deployment steps into Phase 5
- **Canvas 2D**: Treat canvas rendering as a separate module with its own lifecycle
- **AI APIs**: Add API key management and offline fallback to Phase 2 architecture

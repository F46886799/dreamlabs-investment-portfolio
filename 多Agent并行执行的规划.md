# Claude Code + tmux 多 Agent 并行工作流方案

## 项目特性分析

| 维度 | 后端 (Python/FastAPI) | 前端 (TypeScript/React) |
|------|---------------------|------------------------|
| **架构** | 分层 API + Services + Models | TanStack Query + Route Tree |
| **UI** | API JSON | shadcn/ui + Tailwind CSS |
| **测试** | pytest | Playwright E2E |
| **状态** | 数据库事务 | React Query 缓存 |
| **入口** | `backend/app/main.py` | `frontend/src/main.tsx` |

---

## 方案一：tmux Session 架构

```bash
# =====================================================================
# dreamlabs-investment-portfolio - tmux 多窗口并行架构
# =====================================================================

#                    ┌─────────────────────────────────────────────┐
#                    │           dreamlabs SESSION (root)          │
#                    │                                             │
#   ┌──────────────┐ │ ┌─────────────────────────────────────────┐ │
#   │  COORDINATOR │ │ │          MAIN COORDINATION WIN          │ │
#   │     WIN 0    │ │ │  Claude Code 主控会话 (本会话)           │ │
#   │              │ │ │  - 任务分解与分配                         │ │
#   │  本会话用于   │ │ │  - Agent 结果汇总                        │ │
#   │  协调和决策   │ │ │  - 最终集成与验证                        │ │
#   └──────────────┘ │ └─────────────────────────────────────────┘ │
#                     │                                             │
#   ┌──────────────┐ │ ┌──────────────────┐ ┌────────────────────┐ │
#   │  BACKEND     │ │ │     WIN 1        │ │       WIN 2        │ │
#   │   API        │ │ │   backend-dev    │ │   frontend-dev    │ │
#   │              │ │ │                  │ │                   │ │
#   │  Agent 1:    │ │ │  - pytest -v     │ │  - npm run dev   │ │
#   │  Python API  │ │ │  - alembic       │ │  - playwright    │ │
#   │  开发/调试    │ │ │  - fastapi dev   │ │  - vite          │ │
#   └──────────────┘ │ └──────────────────┘ └────────────────────┘ │
#                     │                                             │
#   ┌──────────────┐ │ ┌──────────────────┐ ┌────────────────────┐ │
#   │  TESTING     │ │ │     WIN 3        │ │       WIN 4        │ │
#   │              │ │ │   backend-test   │ │   frontend-test   │ │
#   │  Agent 2:    │ │ │                  │ │                   │ │
#   │  pytest      │ │ │  - pytest        │ │  - playwright     │ │
#   │  单元测试     │ │ │  - coverage      │ │  - E2E tests     │ │
#   └──────────────┘ │ └──────────────────┘ └────────────────────┘ │
#                     │                                             │
#   ┌──────────────┐ │ ┌──────────────────┐                       │
#   │  FRONTEND    │ │ │     WIN 5        │                       │
#   │              │ │ │   research        │                       │
#   │  Agent 3:    │ │ │                  │                       │
#   │  TypeScript  │ │ │  - gh search     │                       │
#   │  组件开发     │ │ │  - Context7 docs │                       │
#   └──────────────┘ │ └──────────────────┘                       │
#                     │                                             │
#                     └─────────────────────────────────────────────┘

# =====================================================================
# 快速启动脚本 - 复制到 ~/.zshrc 或项目根目录
# =====================================================================

alias dreamlabs-tmux='tmux new-session -d -s dreamlabs -c /Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio && \
tmux new-window -t dreamlabs:1 -n backend-dev -c /Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio && \
tmux new-window -t dreamlabs:2 -n frontend-dev -c /Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio && \
tmux new-window -t dreamlabs:3 -n backend-test -c /Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio && \
tmux new-window -t dreamlabs:4 -n frontend-test -c /Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio && \
tmux new-window -t dreamlabs:5 -n research -c /Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio && \
tmux attach-session -t dreamlabs'

# 窗口导航快捷键 (在 tmux 内)
# Ctrl+b 0  - 切换到主协调窗口
# Ctrl+b 1  - 切换到 backend-dev
# Ctrl+b 2  - 切换到 frontend-dev
# Ctrl+b 3  - 切换到 backend-test
# Ctrl+b 4  - 切换到 frontend-test
# Ctrl+b 5  - 切换到 research
# Ctrl+b d  - 脱离 tmux 会话
```

---

## 方案二：Agent 角色定义与任务分配

### Agent 角色矩阵

| Agent | 角色名 | 职责范围 | 技术栈 | 独立性 |
|-------|--------|---------|--------|--------|
| **Agent-A** | Backend API Developer | `backend/app/api/` + `models.py` + `crud.py` | Python/FastAPI/SQLAlchemy | ⭐⭐⭐⭐⭐ |
| **Agent-B** | Backend Service Engineer | `backend/app/services/` + 业务逻辑 + 外部集成 | Python/aioservice | ⭐⭐⭐⭐ |
| **Agent-C** | Frontend Component Developer | `frontend/src/components/` + UI 组件 | React/shadcn/Tailwind | ⭐⭐⭐⭐ |
| **Agent-D** | Frontend Hooks/RTKD Expert | `frontend/src/hooks/` + TanStack Query | TypeScript/@tanstack | ⭐⭐⭐ |
| **Agent-E** | E2E Testing Engineer | `frontend/tests/` + Playwright | TypeScript/Playwright | ⭐⭐⭐⭐⭐ |
| **Agent-F** | Research & Docs | README.md + API Contract + Architecture | Markdown | ⭐⭐⭐⭐⭐ |

### Agent 任务指令模板

#### Agent-A: Backend API Developer

```markdown
# 任务：Backend API 开发

## 上下文
- 项目路径：/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/backend
- 主要文件：
  - `app/api/` - API 路由定义
  - `app/models.py` - SQLAlchemy 模型
  - `app/crud.py` - 数据库操作
  - `app/core/` - 核心配置 (config, security, database)
- 依赖：FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2

## 你的任务
1. 使用 **planner** agent 规划 API 扩展
2. 使用 **tdd-guide** agent 实现 TDD 流程
3. 完成后使用 **code-reviewer** agent 审查

## 约束
- 不要修改 frontend 代码
- 不要修改已稳定的 API contract
- 所有改动需通过 `backend/app/api/` 下的模块进行

## 输出
返回：修改的文件列表 + 测试结果 + 代码审查意见
```

#### Agent-C: Frontend Component Developer

```markdown
# 任务：Frontend UI 组件开发

## 上下文
- 项目路径：/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/frontend
- 设计系统：shadcn/ui "new-york" 风格，OKLCH 色彩空间
- 主色：oklch(0.5982 0.10687 182.4689) — 信任蓝
- 警告色：amber-600 / 成功色：green-600
- 数字格式化：`font-mono tabular-nums`
- 组件库：`frontend/src/components/ui/` (已有组件勿重复创建)

## 你的任务
1. 先阅读 `DESIGN.md` 了解设计规范
2. 使用 **planner** agent 规划组件架构
3. 使用 **tdd-guide** agent (若需要单元测试)
4. 完成后使用 **code-reviewer** agent 审查

## 约束
- 优先使用 `frontend/src/components/ui/` 中的现有组件
- 使用 Tailwind 工具类，不要自定义 CSS
- 遵循 `DESIGN.md` 中的色彩语义

## 输出
返回：修改的文件列表 + Playwright 截图 (如有) + 代码审查意见
```

#### Agent-E: E2E Testing Engineer

```markdown
# 任务：Playwright E2E 测试开发

## 上下文
- 项目路径：/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/frontend
- 测试文件：`frontend/tests/` ( portfolio.spec.ts 等)
- Playwright 配置：`playwright.config.ts`
- 测试报告：`frontend/playwright-report/`

## 你的任务
1. 阅读 `frontend/tests/portfolio.spec.ts` 了解现有测试
2. 使用 **tdd-guide** agent 扩展测试用例
3. 运行 `npx playwright test` 验证
4. 使用 **code-reviewer** agent 审查测试代码

## 约束
- 测试文件命名：`*.spec.ts`
- 关键用户流必须覆盖：portfolio 查看、冲突检测、审计日志
- E2E 测试需在真实浏览器环境运行

## 输出
返回：测试用例列表 + Playwright 报告截图 + 代码审查意见
```

---

## 方案三：并行调度执行脚本

```bash
#!/bin/zsh
# =====================================================================
# dreamlabs-parallel-agents.sh
# 基于 tmux 的 Claude Code 多 Agent 并行调度脚本
# =====================================================================

set -e

PROJECT_ROOT="/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio"
TMUX_SESSION="dreamlabs"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =====================================================================
# Phase 1: 环境准备
# =====================================================================
phase1_setup() {
    log_info "Phase 1: 环境准备..."

    # 检查 tmux 是否运行
    if tmux has-session -t $TMUX_SESSION 2>/dev/null; then
        log_warn "Session $TMUX_SESSION 已存在，将复用"
    else
        log_info "创建 tmux session: $TMUX_SESSION"
        tmux new-session -d -s $TMUX_SESSION -c $PROJECT_ROOT
    fi

    # 创建专用窗口
    tmux new-window -t $TMUX_SESSION:10 -n parallel-agents -c $PROJECT_ROOT 2>/dev/null || true

    log_success "环境准备完成"
}

# =====================================================================
# Phase 2: 并行 Agent 调度
# =====================================================================
phase2_dispatch() {
    log_info "Phase 2: 并行调度 Agents..."

    # --- Agent A: Backend API (在 window 1) ---
    log_info "启动 Agent A: Backend API Developer"
    tmux send-keys -t $TMUX_SESSION:1 "cd $PROJECT_ROOT/backend && source .venv/bin/activate" Enter
    tmux send-keys -t $TMUX_SESSION:1 "使用 tdd-guide agent 实现新的 portfolio API 端点" Enter

    # --- Agent C: Frontend Components (在 window 2) ---
    log_info "启动 Agent C: Frontend Component Developer"
    tmux send-keys -t $TMUX_SESSION:2 "cd $PROJECT_ROOT/frontend && npm run dev &" Enter
    tmux send-keys -t $TMUX_SESSION:2 "使用 planner agent 规划 PortfolioCard 组件重构" Enter

    # --- Agent E: E2E Testing (在 window 4) ---
    log_info "启动 Agent E: E2E Testing Engineer"
    tmux send-keys -t $TMUX_SESSION:4 "cd $PROJECT_ROOT/frontend && npx playwright test --ui &" Enter

    log_success "Agents 已分发到各窗口"
}

# =====================================================================
# Phase 3: 状态监控
# =====================================================================
phase3_monitor() {
    log_info "Phase 3: 监控各 Agent 状态..."

    echo ""
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│                  TMUX WINDOW STATUS                        │"
    echo "├─────────────┬─────────────────────────────────────────────┤"

    for i in 1 2 3 4 5; do
        WIN_NAME=$(tmux display-message -t $TMUX_SESSION:$i -p '#{window_name}' 2>/dev/null || echo "N/A")
        WIN_PANES=$(tmux list-panes -t $TMUX_SESSION:$i 2>/dev/null | wc -l | tr -d ' ')
        echo "│ Window $i    │ $WIN_NAME (panes: $WIN_PANES)"
    done

    echo "└─────────────┴─────────────────────────────────────────────┘"
    echo ""
    log_info "使用 'tmux attach -t $TMUX_SESSION' 连接到会话"
    log_info "使用 'Ctrl+b d' 脱离会话"
}

# =====================================================================
# 主流程
# =====================================================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║     dreamlabs-investment-portfolio                        ║"
    echo "║          Claude Code + tmux Multi-Agent 并行方案           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    case "${1:-}" in
        setup)
            phase1_setup
            ;;
        dispatch)
            phase2_dispatch
            ;;
        monitor)
            phase3_monitor
            ;;
        all)
            phase1_setup
            phase2_dispatch
            phase3_monitor
            ;;
        attach)
            tmux attach-session -t $TMUX_SESSION
            ;;
        kill)
            log_warn "销毁 tmux session: $TMUX_SESSION"
            tmux kill-session -t $TMUX_SESSION
            ;;
        *)
            echo "用法: $0 {setup|dispatch|monitor|all|attach|kill}"
            echo ""
            echo "  setup    - 创建 tmux 环境"
            echo "  dispatch - 分发并行任务"
            echo "  monitor  - 监控状态"
            echo "  all      - 执行完整流程"
            echo "  attach   - 连接到 tmux 会话"
            echo "  kill     - 销毁会话"
            ;;
    esac
}

main "$@"
```

---

## 方案四：实际场景工作流

### 场景 1：同时开发 Portfolio API + 前端组件

```
┌────────────────────────────────────────────────────────────────────┐
│  MAIN SESSION (协调者)                                             │
│                                                                     │
│  用户: "实现 Portfolio 资产的添加API和前端表单组件"                    │
│                                                                     │
│  分解任务:                                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Task 1: Backend API - POST /api/v1/portfolios/{id}/assets   │  │
│  │ Task 2: Frontend - AssetFormDialog 组件                     │  │
│  │ Task 3: Integration - E2E 测试资产添加流程                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  并行分发:                                                          │
└────────────────────────────────────────────────────────────────────┘
              │
              ├──▶ Agent A (Backend): planner → tdd-guide → code-reviewer
              │                          │
              │                          └─▶ 实现 app/api/portfolios.py
              │                              测试: tests/test_portfolios.py
              │
              ├──▶ Agent C (Frontend): planner → 实现 AssetFormDialog
              │                          │
              │                          └─▶ components/Portfolio/AssetFormDialog.tsx
              │
              └──▶ Agent E (E2E): 编写 asset-creation.spec.ts
                                      │
                                      └─▶ tests/asset-creation.spec.ts
```

### 场景 2：修复后端 pytest 失败 + 前端 Playwright 失败

```
┌────────────────────────────────────────────────────────────────────┐
│  问题诊断阶段 (单一 Agent 快速定位)                                   │
└────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  并行修复阶段                                                        │
│                                                                     │
│  Agent A ──▶ pytest tests/backend/test_portfolios.py::test_create  │
│  (修复: Alembic migration 顺序问题)                                   │
│                                                                     │
│  Agent C ──▶ playwright tests/portfolio.spec.ts::test_asset_form  │
│  (修复: TanStack Query mutation 缓存失效)                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 方案五：Claude Code Agent 协作配置

```bash
# =====================================================================
# ~/.claude/settings.json 或项目 .claude/settings.json
# =====================================================================

{
  "agents": {
    "backend-developer": {
      "description": "Backend API 开发专家",
      "workingDirectory": "/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/backend",
      "defaultModel": "sonnet",
      "preferredTools": ["planner", "tdd-guide", "code-reviewer"],
      "environment": {
        "PYTHONPATH": "/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/backend",
        "pytest": "pytest tests/ -v --tb=short"
      }
    },
    "frontend-developer": {
      "description": "Frontend React 开发专家",
      "workingDirectory": "/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/frontend",
      "defaultModel": "sonnet",
      "preferredTools": ["planner", "tdd-guide", "code-reviewer", "design-consultation"],
      "environment": {
        "NODE_ENV": "development",
        "npm_script": "npm run dev"
      }
    },
    "e2e-tester": {
      "description": "Playwright E2E 测试专家",
      "workingDirectory": "/Users/Frank/Work/Frameworks/Coding/dreamlabs-investment-portfolio/frontend",
      "defaultModel": "haiku",
      "preferredTools": ["tdd-guide", "code-reviewer"],
      "environment": {
        "playwright": "npx playwright test --reporter=list"
      }
    }
  },
  "parallelExecution": {
    "maxConcurrent": 4,
    "strategy": "independent-first",
    "conflictResolution": "coordinator-wins"
  }
}
```

---

## 快速参考卡

```bash
# ┌─────────────────────────────────────────────────────────────────┐
# │           dreamlabs-investment-portfolio                        │
# │              Claude Code + tmux 多 Agent 备忘                     │
# ├─────────────────────────────────────────────────────────────────┤
# │                                                                 │
# │  启动全流程:                                                      │
# │  $ ./dreamlabs-parallel-agents.sh all                           │
# │                                                                 │
# │  连接 tmux:                                                      │
# │  $ tmux attach -t dreamlabs                                      │
# │                                                                 │
# │  Agent 分发:                                                     │
# │  $ ./dreamlabs-parallel-agents.sh dispatch                       │
# │                                                                 │
# │  tmux 内导航:                                                    │
# │  Ctrl+b 0  → 主窗口 (协调者)                                      │
# │  Ctrl+b 1  → backend-dev (Agent A)                               │
# │  Ctrl+b 2  → frontend-dev (Agent C)                              │
# │  Ctrl+b 3  → backend-test (Agent B)                              │
# │  Ctrl+b 4  → frontend-test (Agent E)                             │
# │  Ctrl+b 5  → research (Agent F)                                  │
# │  Ctrl+b d  → 脱离 tmux                                           │
# │                                                                 │
# │  常用命令:                                                       │
# │  $ cd frontend && npx playwright test                           │
# │  $ cd backend && source .venv/bin/activate && pytest -v          │
# │                                                                 │
# │  Agent 技能路由:                                                  │
# │  ┌───────────────┬────────────────────────────────────────────┐ │
# │  │ 任务类型       │ 使用 Agent                                  │ │
# │  ├───────────────┼────────────────────────────────────────────┤ │
# │  │ 复杂功能规划   │ planner                                      │ │
# │  │ 新功能开发     │ tdd-guide + code-reviewer                   │ │
# │  │ Bug 调试       │ investigate                                  │ │
# │  │ 代码审查       │ review                                       │ │
# │  │ 设计系统       │ design-consultation                         │ │
# │  │ 发布/部署      │ ship                                         │ │
# │  │ 性能优化       │ ecc:performance-optimizer                    │ │
# │  └───────────────┴────────────────────────────────────────────┘ │
# └─────────────────────────────────────────────────────────────────┘
```

---

## 关键设计原则

| 原则 | 说明 |
|------|------|
| **独立性最大化** | 每个 Agent 独立 working directory，避免共享状态冲突 |
| **模型选择** | Haiku 用于快速任务，Sonnet 用于复杂开发，Opus 用于架构决策 |
| **工具链匹配** | 后端用 pytest，前端用 Playwright，遵循项目已有工具 |
| **色彩语义** | shadcn/ui 规范：primary=信任蓝, amber=警告, green=成功 |
| **串行协调** | 任务分解和结果集成在主会话执行，并行 Agent 只做执行 |

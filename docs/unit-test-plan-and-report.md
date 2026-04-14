# 单元测试任务计划与执行报告

## 任务计划（前后端）

- [x] 梳理前后端现有测试框架和可执行命令
- [x] 建立前端单元测试执行入口（与现有 Playwright E2E 分离）
- [x] 补充前端基础单元测试（`frontend/src/utils.ts`）
- [x] 执行后端单元测试（Pytest）
- [x] 执行前端单元测试（Bun Test）
- [x] 汇总测试结果并形成报告

## 执行命令

### 后端（Python / Pytest）

```bash
cd backend
uv sync
uv run ruff check .
uv run pytest -q
```

### 前端（Bun Unit Tests）

```bash
cd frontend
bun install
bun run test:unit
```

## 测试结果

### 后端结果

- `ruff check`：通过（All checks passed）
- `pytest -q`：通过（`79 passed, 75 warnings`）

### 前端结果

- 新增单元测试文件：`frontend/src/utils.test.ts`
- `bun run test:unit`：通过（4 个用例全部通过）

## 备注

- 现有 `frontend/tests/*.spec.ts` 为 Playwright 端到端测试，不属于单元测试范畴。
- 本次改动未调整业务逻辑，仅补齐并落地前端单元测试入口与基础用例。

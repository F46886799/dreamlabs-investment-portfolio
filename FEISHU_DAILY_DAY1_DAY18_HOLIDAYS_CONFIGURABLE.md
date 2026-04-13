# 飞书连续消息模板（Day1~Day18，法定节假日可配置跳过）

> 用法：先改“配置区”，再按下方脚本生成 Day1~Day18 日期映射，最后把 `{{DAYx_DATE}}` 替换后直接发。

---

## 1) 配置区（可改）

- `START_DATE`：起始日期（建议填计划启动日）
- `HOLIDAYS`：法定节假日（这些日期会被跳过）
- `WORKDAY_OVERRIDES`：周末补班日（这些周末会被当作工作日）

示例配置：

```yaml
START_DATE: 2026-04-13
HOLIDAYS:
  - 2026-05-01
  - 2026-05-02
  - 2026-05-03
WORKDAY_OVERRIDES:
  - 2026-04-26
  - 2026-05-09
```

---

## 2) 日期自动生成脚本（复制到终端执行）

> 作用：按“跳过周末 + 跳过 HOLIDAYS + 纳入 WORKDAY_OVERRIDES”生成 Day1~Day18 日期。

```bash
python - <<'PY'
from datetime import date, timedelta

START_DATE = date(2026, 4, 13)
HOLIDAYS = {
    date(2026, 5, 1),
    date(2026, 5, 2),
    date(2026, 5, 3),
}
WORKDAY_OVERRIDES = {
    date(2026, 4, 26),
    date(2026, 5, 9),
}

def is_workday(d: date) -> bool:
    if d in WORKDAY_OVERRIDES:
        return True
    if d in HOLIDAYS:
        return False
    return d.weekday() < 5  # 0=Mon ... 6=Sun

result = []
cur = START_DATE
while len(result) < 18:
    if is_workday(cur):
        result.append(cur)
    cur += timedelta(days=1)

for i, d in enumerate(result, 1):
    print(f"DAY{i}={d.isoformat()}")
PY
```

---

## 3) 负责人映射（先替换）

- `@TechOwner = @张三`
- `@DataOwner = @李四`
- `@QaOwner = @王五`
- `@PmOwner = @赵六`

---

## 4) Day1~Day18 消息模板（日期占位符版）

### Day1（{{DAY1_DATE}}）
【Daily Standup | Day1 | Phase 0 | {{DAY1_DATE}}】
今日目标：锁定候选数据源与访谈名单
今日验收标准：
- [ ] 锁定2个候选数据源（稳定API+沙盒+鉴权明确）
- [ ] 锁定5位访谈对象（最低3位）
责任人：@DataOwner @PmOwner

### Day2（{{DAY2_DATE}}）
【Daily Standup | Day2 | Phase 0 | {{DAY2_DATE}}】
今日目标：完成访谈 #1/#2，沉淀量化证据
今日验收标准：
- [ ] 完成2位访谈并记录三项指标（耗时/决策延迟/愿付费）
- [ ] 提炼至少3条可量化痛点
责任人：@PmOwner @DataOwner

### Day3（{{DAY3_DATE}}）
【Daily Standup | Day3 | Phase 0 | {{DAY3_DATE}}】
今日目标：完成访谈 #3/#4，输出周报字段初稿
今日验收标准：
- [ ] 再完成2位访谈
- [ ] 周报字段初稿<=8项，含定义/来源/异常处理
责任人：@PmOwner @DataOwner

### Day4（{{DAY4_DATE}}）
【Daily Standup | Day4 | Phase 0 | {{DAY4_DATE}}】
今日目标：补齐第5位访谈并闭合G1/G2
今日验收标准：
- [ ] 访谈累计达到5位（最低3位）
- [ ] 锁定G1（数据源）/G2（周报字段）
责任人：@PmOwner @DataOwner @TechOwner

### Day5（{{DAY5_DATE}}）
【Daily Standup | Day5 | Phase 0 | {{DAY5_DATE}}】
今日目标：闭合技术门禁G3/G4
今日验收标准：
- [ ] 锁定并发策略（并行拉取+版本化快照）
- [ ] 锁定角色模型（admin/operator/viewer）与stale告警规则
责任人：@TechOwner @PmOwner

### Day6（{{DAY6_DATE}}）
【Daily Standup | Day6 | Phase 0 | {{DAY6_DATE}}】
今日目标：Phase 0出口评审（Go/No-Go）
今日验收标准：
- [ ] G1~G4闭合结论明确
- [ ] 形成Go/No-Go与下一步动作
责任人：@PmOwner @TechOwner @DataOwner

### Day7（{{DAY7_DATE}}）
【Daily Standup | Day7 | Phase 1 | {{DAY7_DATE}}】
今日目标：模型与迁移骨架落地
今日验收标准：
- [ ] raw/normalized/audit模型初版
- [ ] Alembic迁移可执行且可回滚
责任人：@TechOwner

### Day8（{{DAY8_DATE}}）
【Daily Standup | Day8 | Phase 1 | {{DAY8_DATE}}】
今日目标：连接器骨架+鉴权打通
今日验收标准：
- [ ] 首个数据源最小样本拉通
- [ ] 失败分类（timeout/429/5xx）可观测
责任人：@TechOwner @DataOwner

### Day9（{{DAY9_DATE}}）
【Daily Standup | Day9 | Phase 1 | {{DAY9_DATE}}】
今日目标：标准化流水与SSOT映射
今日验收标准：
- [ ] 统一字段字典（SSOT）建立
- [ ] 冲突进入normalization_conflicts
责任人：@TechOwner @DataOwner

### Day10（{{DAY10_DATE}}）
【Daily Standup | Day10 | Phase 1 | {{DAY10_DATE}}】
今日目标：审计链落地
今日验收标准：
- [ ] audit_events写入完整
- [ ] 支持按实体追溯
责任人：@TechOwner

### Day11（{{DAY11_DATE}}）
【Daily Standup | Day11 | Phase 1 | {{DAY11_DATE}}】
今日目标：后台任务与并发控制
今日验收标准：
- [ ] sync后台化
- [ ] 限流+退避+熔断+幂等生效
责任人：@TechOwner

### Day12（{{DAY12_DATE}}）
【Daily Standup | Day12 | Phase 1 | {{DAY12_DATE}}】
今日目标：unified接口与stale可见告警
今日验收标准：
- [ ] unified读取最近完整快照
- [ ] stale=true时用户可见告警
责任人：@TechOwner @PmOwner

### Day13（{{DAY13_DATE}}）
【Daily Standup | Day13 | Phase 1 | {{DAY13_DATE}}】
今日目标：health-report接口可用
今日验收标准：
- [ ] 周报字段按锁定清单输出
- [ ] 异常字段降级策略可验证
责任人：@TechOwner @DataOwner

### Day14（{{DAY14_DATE}}）
【Daily Standup | Day14 | Phase 1 | {{DAY14_DATE}}】
今日目标：audit查询接口与权限处理
今日验收标准：
- [ ] audit查询可用
- [ ] 无权限/404处理正确
责任人：@TechOwner @QaOwner

### Day15（{{DAY15_DATE}}）
【Daily Standup | Day15 | Phase 1 | {{DAY15_DATE}}】
今日目标：单测+集成测试补齐
今日验收标准：
- [ ] 冲突分流单测
- [ ] stale降级集成测试
- [ ] sync幂等/重试测试
责任人：@QaOwner @TechOwner

### Day16（{{DAY16_DATE}}）
【Daily Standup | Day16 | Phase 1 | {{DAY16_DATE}}】
今日目标：E2E主链+失败链
今日验收标准：
- [ ] 主链E2E通过
- [ ] 失败链E2E通过
责任人：@QaOwner @TechOwner

### Day17（{{DAY17_DATE}}）
【Daily Standup | Day17 | Phase 1 | {{DAY17_DATE}}】
今日目标：对账基线验证与修复
今日验收标准：
- [ ] 三项指标相对基准样本差异率<1%
- [ ] 差异项复测通过
责任人：@DataOwner @QaOwner @TechOwner

### Day18（{{DAY18_DATE}}）
【Daily Standup | Day18 | Phase 1 | {{DAY18_DATE}}】
今日目标：/ship前冻结与Go/No-Go
今日验收标准：
- [ ] G1~G4全闭合
- [ ] 覆盖率>=80%
- [ ] 2条E2E稳定通过
- [ ] 差异率<1%
- [ ] stale告警可见
- [ ] 回滚路径可用
责任人：@PmOwner @TechOwner @QaOwner @DataOwner

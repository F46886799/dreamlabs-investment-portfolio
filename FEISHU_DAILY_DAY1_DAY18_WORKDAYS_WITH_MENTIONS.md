# 飞书连续消息模板（工作日版 Day1~Day18，自动跳过周末，末尾 @负责人）

起始规则
- 基准日期：2026-04-11（周六）
- Day1 从下一个工作日开始：2026-04-13（周一）
- 仅按“跳过周末”排期（不处理法定节假日调休）

负责人映射（先替换）
- @TechOwner = @张三
- @DataOwner = @李四
- @QaOwner = @王五
- @PmOwner = @赵六

---

## Day1（2026-04-13 周一）
【Daily Standup | Day1 | Phase 0 | 2026-04-13】
今日目标：锁定候选数据源与访谈名单
今日验收标准：
- [ ] 锁定2个候选数据源（稳定API+沙盒+鉴权明确）
- [ ] 锁定5位访谈对象（最低3位）
责任人：@DataOwner @PmOwner

## Day2（2026-04-14 周二）
【Daily Standup | Day2 | Phase 0 | 2026-04-14】
今日目标：完成访谈 #1/#2，沉淀量化证据
今日验收标准：
- [ ] 完成2位访谈并记录三项指标（耗时/决策延迟/愿付费）
- [ ] 提炼至少3条可量化痛点
责任人：@PmOwner @DataOwner

## Day3（2026-04-15 周三）
【Daily Standup | Day3 | Phase 0 | 2026-04-15】
今日目标：完成访谈 #3/#4，输出周报字段初稿
今日验收标准：
- [ ] 再完成2位访谈
- [ ] 周报字段初稿<=8项，含定义/来源/异常处理
责任人：@PmOwner @DataOwner

## Day4（2026-04-16 周四）
【Daily Standup | Day4 | Phase 0 | 2026-04-16】
今日目标：补齐第5位访谈并闭合G1/G2
今日验收标准：
- [ ] 访谈累计达到5位（最低3位）
- [ ] 锁定G1（数据源）/G2（周报字段）
责任人：@PmOwner @DataOwner @TechOwner

## Day5（2026-04-17 周五）
【Daily Standup | Day5 | Phase 0 | 2026-04-17】
今日目标：闭合技术门禁G3/G4
今日验收标准：
- [ ] 锁定并发策略（并行拉取+版本化快照）
- [ ] 锁定角色模型（admin/operator/viewer）与stale告警规则
责任人：@TechOwner @PmOwner

## Day6（2026-04-20 周一）
【Daily Standup | Day6 | Phase 0 | 2026-04-20】
今日目标：Phase 0出口评审（Go/No-Go）
今日验收标准：
- [ ] G1~G4闭合结论明确
- [ ] 形成Go/No-Go与下一步动作
责任人：@PmOwner @TechOwner @DataOwner

## Day7（2026-04-21 周二）
【Daily Standup | Day7 | Phase 1 | 2026-04-21】
今日目标：模型与迁移骨架落地
今日验收标准：
- [ ] raw/normalized/audit模型初版
- [ ] Alembic迁移可执行且可回滚
责任人：@TechOwner

## Day8（2026-04-22 周三）
【Daily Standup | Day8 | Phase 1 | 2026-04-22】
今日目标：连接器骨架+鉴权打通
今日验收标准：
- [ ] 首个数据源最小样本拉通
- [ ] 失败分类（timeout/429/5xx）可观测
责任人：@TechOwner @DataOwner

## Day9（2026-04-23 周四）
【Daily Standup | Day9 | Phase 1 | 2026-04-23】
今日目标：标准化流水与SSOT映射
今日验收标准：
- [ ] 统一字段字典（SSOT）建立
- [ ] 冲突进入normalization_conflicts
责任人：@TechOwner @DataOwner

## Day10（2026-04-24 周五）
【Daily Standup | Day10 | Phase 1 | 2026-04-24】
今日目标：审计链落地
今日验收标准：
- [ ] audit_events写入完整
- [ ] 支持按实体追溯
责任人：@TechOwner

## Day11（2026-04-27 周一）
【Daily Standup | Day11 | Phase 1 | 2026-04-27】
今日目标：后台任务与并发控制
今日验收标准：
- [ ] sync后台化
- [ ] 限流+退避+熔断+幂等生效
责任人：@TechOwner

## Day12（2026-04-28 周二）
【Daily Standup | Day12 | Phase 1 | 2026-04-28】
今日目标：unified接口与stale可见告警
今日验收标准：
- [ ] unified读取最近完整快照
- [ ] stale=true时用户可见告警
责任人：@TechOwner @PmOwner

## Day13（2026-04-29 周三）
【Daily Standup | Day13 | Phase 1 | 2026-04-29】
今日目标：health-report接口可用
今日验收标准：
- [ ] 周报字段按锁定清单输出
- [ ] 异常字段降级策略可验证
责任人：@TechOwner @DataOwner

## Day14（2026-04-30 周四）
【Daily Standup | Day14 | Phase 1 | 2026-04-30】
今日目标：audit查询接口与权限处理
今日验收标准：
- [ ] audit查询可用
- [ ] 无权限/404处理正确
责任人：@TechOwner @QaOwner

## Day15（2026-05-01 周五）
【Daily Standup | Day15 | Phase 1 | 2026-05-01】
今日目标：单测+集成测试补齐
今日验收标准：
- [ ] 冲突分流单测
- [ ] stale降级集成测试
- [ ] sync幂等/重试测试
责任人：@QaOwner @TechOwner

## Day16（2026-05-04 周一）
【Daily Standup | Day16 | Phase 1 | 2026-05-04】
今日目标：E2E主链+失败链
今日验收标准：
- [ ] 主链E2E通过
- [ ] 失败链E2E通过
责任人：@QaOwner @TechOwner

## Day17（2026-05-05 周二）
【Daily Standup | Day17 | Phase 1 | 2026-05-05】
今日目标：对账基线验证与修复
今日验收标准：
- [ ] 三项指标相对基准样本差异率<1%
- [ ] 差异项复测通过
责任人：@DataOwner @QaOwner @TechOwner

## Day18（2026-05-06 周三）
【Daily Standup | Day18 | Phase 1 | 2026-05-06】
今日目标：/ship前冻结与Go/No-Go
今日验收标准：
- [ ] G1~G4全闭合
- [ ] 覆盖率>=80%
- [ ] 2条E2E稳定通过
- [ ] 差异率<1%
- [ ] stale告警可见
- [ ] 回滚路径可用
责任人：@PmOwner @TechOwner @QaOwner @DataOwner

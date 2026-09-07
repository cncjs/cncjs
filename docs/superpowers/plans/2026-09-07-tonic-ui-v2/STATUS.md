# Migration task status

更新日期：2026-09-07。執行模式：**plan_only / paused**。目前沒有 migration task 正在執行；計畫文件完成不代表實作完成。恢復 implementation 需要使用者明確要求執行。

本檔是任務狀態唯一來源；[HANDOFF](HANDOFF.md) 是恢復入口，[執行規則](EXECUTION.md) 定義狀態轉移。不要由聊天歷史或已消失的 /tmp 文件猜進度。

## Current checkpoint

- Active task: none
- Main: gpt-5.6-terra / high；worker: gpt-5.6-luna / high 或 max（依 EXECUTION）；advisor: gpt-5.6-sol / medium（按需唯讀）。active subagent: none；concurrency: 1。角色已授權，implementation 仍 paused。
- Next eligible task: F1（僅在獲得執行授權後）
- Current blockers: none；一般未完成依賴仍是 todo，不是 blocking。
- Source inventory baseline: f301cde7；最近已見文件提交 e09a642c。接手時重新記錄 HEAD/worktree，不硬編碼此值為當前 HEAD。
- Validation: app/frontend/browser/simulator regression 尚未執行。

## Task ledger

依賴是完成條件；R1/R2/R4/R5 的案例需在對應重構開始前準備，通過 gate 才在表中 completed，避免反向循環依賴。

| ID | Plan / deliverable | Depends on | Status | Owner / updated | Evidence / blocker |
| --- | --- | --- | --- | --- | --- |
| F1 | [環境與既有行為](01-foundation.md) | — | todo | — | — |
| H1 | [frontend config](details/01a-test-harness.md) | F1 | todo | — | — |
| H2 | [providers tests](details/01a-test-harness.md) | H1 | todo | — | — |
| H3 | [lifecycle 工具](details/01a-test-harness.md) | H2 | todo | — | — |
| BR0 | [可重跑 browser baseline](details/09a-browser-procedure.md) | H3 | todo | — | — |
| R0 | [原版 baseline](09-regression-gates.md) | BR0 | todo | — | — |
| D1 | [chrome 純資料](details/02a-widget-state.md) | R0 | todo | — | — |
| D2 | [Provider](details/02a-widget-state.md) | D1 | todo | — | — |
| D3 | [16 shells 接線](details/02a-widget-state.md) | D2 | todo | — | — |
| D4 | [Workspace 接線](details/02a-widget-state.md) | D3 | todo | — | — |
| R1 | [chrome 驗收](09-regression-gates.md) | D4 | todo | — | — |
| R2 | [Workspace 驗收](09-regression-gates.md) | D4 | todo | — | — |
| U2 | [primitives pilot](02-shared-ui.md) | R1, R2 | todo | — | — |
| U3 | [overlay/form 合約](02-shared-ui.md) | U2 | todo | — | — |
| B0 | [HTTP import baseline](details/03b-query-boundaries.md) | H3 | todo | — | — |
| B1 | [session boundary](details/03b-query-boundaries.md) | B0, U3 | todo | — | — |
| M1 | [Macro query](details/03a-query-contract.md) | B0, U3 | todo | — | — |
| M2 | [Macro mutation](details/03a-query-contract.md) | M1 | todo | — | — |
| M3 | [Macro UI](details/03a-query-contract.md) | M2 | todo | — | — |
| Q2-cleanup | [fetch machine 移除與跨畫面驗收](03-query-and-macro.md) | M3 | todo | — | — |
| G1 | [Connection](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| G2 | [GCode](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| G3 | [Spindle](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| G4 | [Laser](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| G5 | [Probe](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| G6 | [Custom](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| G7 | [Webcam](04-general-widgets.md) | U3, Q2-cleanup | todo | — | — |
| T1 | [Terminal baseline](details/04a-terminal-owner.md) | U3 | todo | — | — |
| T2 | [Terminal owner](details/04a-terminal-owner.md) | T1 | todo | — | — |
| T3 | [Terminal lifecycle](details/04a-terminal-owner.md) | T2 | todo | — | — |
| C1 | [Grbl](05-controller-widgets.md) | G4 | todo | — | — |
| C2 | [Marlin](05-controller-widgets.md) | G4 | todo | — | — |
| C3 | [Smoothie](05-controller-widgets.md) | G4 | todo | — | — |
| C4 | [TinyG/g2core](05-controller-widgets.md) | G4 | todo | — | — |
| S1 | [Settings draft](details/06a-controlled-settings.md) | U3, Q2-cleanup | todo | — | — |
| S2 | [MDI query](details/06a-controlled-settings.md) | S1 | todo | — | — |
| S3 | [Settings tabs](details/06a-controlled-settings.md) | S2 | todo | — | — |
| S4 | [Settings save](details/06a-controlled-settings.md) | S3 | todo | — | — |
| A1b | [Axes input](06-motion-widgets.md) | S4, G4 | todo | — | — |
| A2 | [Tool](06-motion-widgets.md) | A1b | todo | — | — |
| A3a | [Autolevel forms](06-motion-widgets.md) | A1b | todo | — | — |
| A3b | [Autolevel workflow](06-motion-widgets.md) | A3a | todo | — | — |
| R3 | [geometry baseline](09-regression-gates.md) | R0 | todo | — | — |
| V1 | [toolbar/watch directory](07-visualizer.md) | A3b, U3 | todo | — | — |
| E1 | [load characterization](details/07a-visualizer-engine.md) | R3, A3b | todo | — | — |
| E2 | [engine extraction](details/07a-visualizer-engine.md) | E1 | todo | — | — |
| E3 | [engine ownership](details/07a-visualizer-engine.md) | E2 | todo | — | — |
| E4 | [owner integration](details/07a-visualizer-engine.md) | E3, V1 | todo | — | — |
| R4 | [resources 驗收](09-regression-gates.md) | E4, T3 | todo | — | — |
| R5 | [commands 驗收](09-regression-gates.md) | E4, A1b, A3b, T3, C1, C2, C3, C4 | todo | — | — |
| W1 | [Workspace domain](08-workspace-and-cleanup.md) | G1, G2, G3, G4, G5, G6, G7, T3, C1, C2, C3, C4, A2, A3b, E4, B1 | todo | — | — |
| P0 | [unused families](details/08a-component-families.md) | U3 | todo | — | — |
| P1 | [overlays](details/08a-component-families.md) | W1, P0 | todo | — | — |
| P2 | [forms](details/08a-component-families.md) | P1 | todo | — | — |
| P3 | [layout](details/08a-component-families.md) | P2 | todo | — | — |
| P4 | [Administration tables](details/08a-component-families.md) | P3 | todo | — | — |
| P5 | [domain families](details/08a-component-families.md) | P4 | todo | — | — |
| P6 | [class 對帳](details/08a-component-families.md) | P5 | todo | — | — |
| B3 | [static migration gate](details/03b-query-boundaries.md) | P6, B1 | todo | — | — |
| R6 | [全 browser/performance 驗收](09-regression-gates.md) | B3, R4, R5 | todo | — | — |
| W3 | [依賴清理與最終 gate](08-workspace-and-cleanup.md) | R6 | todo | — | — |

## 父 task 對應（不再另領一次）

| 父 task | 唯一執行單位 |
| --- | --- |
| F2 | H1–H3 |
| U1a/U1b | D1–D4 + R1/R2；D3/D4 為同一可交付整合批次 |
| Q1 | M1/M2 |
| Q2 | M3 + Q2-cleanup；cleanup 僅做未由 M3 完成的刪除、跨畫面驗收 |
| G8 | T1–T3 |
| A1a | S1–S4 |
| A3 | A3a/A3b |
| V2/V3 | E1–E4 + R4/R5 |
| W2 | P0–P6 |
| B2 | M1–M3、S2/S4、A2/A3b、V1、W1 的資源搬移彙總，不另實作 |

## Blocker records

目前無。新增格式：

- Blocker ID / task:
- Observed failure + exact command / exit code:
- Cause / evidence path:
- Attempts and results:
- Required unblock action / owner:
- Next check condition（版本、依賴、使用者輸入等；不靠無限重試）:
- Unaffected eligible tasks:

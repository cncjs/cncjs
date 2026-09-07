# 04b — 一般 widgets / controller 的細部 regression contracts

G1–G7、C1–C4 開始時先讀本文件。修改範圍與 test file 使用父文件及 inventory 的精確列表；以下補充 action oracle 與 state ownership。每個 task 先用原版建立 assertions，再改 class/UI，禁止以重構後輸出生成 expected。

## State / lifecycle 分工

| Task | Owner 與必測情境 |
| --- | --- |
| G1 Connection | index 只處理 chrome；Connection 擁有 port/baud/serial-network draft、pending/error。open/close timeout cleanup，連線回覆晚於 disconnect 不恢復舊 pending；rerender 不 connect。保存 custom option 的 port metadata，Tonic native Select 不能靜默丟棄資訊 |
| G2 GCode | metadata 由原 store/events 提供；loading/empty、units、line count、收合/展開保持資料；任何呈現操作零 controller command |
| G3 Spindle | speed 是受控 draft；空值與 0 分別測。coolant M7/M8/M9；正轉 M3 或 M3 S{speed}、反轉 M4 或 M4 S{speed}、停止 M5。每次 action 一次 command('gcode', payload) |
| G4 Laser | LaserTest 擁有 power/duration/maxS draft；start command('laser_test', power, duration, maxS)，stop command('laser_test', 0)。override 使用 spindle_override -10/-1/1/10/0；長按計時器只有一個 owner |
| G5 Probe | ProbeModal 取得受控參數並生成 preview；確定時 command('gcode', content) 一次；cancel/invalid/disconnected 不發送；固定 units/offset fixture 比對完整 content |
| G6 Custom | URL 草稿在 Settings owner；Save 寫 config，Cancel 不寫；fork ID 隔離；Iframe load/message listener cleanup，不在 class ref 讀 URL |
| G7 Webcam | URL/media state 在 resource hook，settings draft 在 modal；旋轉/flip/crosshair/mute 更新不重建 media owner；URL 變更、late load、timeout、unmount 清理 |
| C1 Grbl | 延用原 store/controller shape；settings modal、override、tabs 分開 state；不新增第二份機器狀態 |
| C2/C3/C4 | index 的 controller:settings/controller:state listeners 改 owner effects；先保存全部其他事件名稱及 payload，再搬移。type filter、connection switch、partial state merge、unmount 都測 |

## 精確 command oracle

下面區分 write/writeln/command，不可只比對字串忽略傳輸方法。控制器回報測試分別建 Grbl、Marlin、Smoothie、TinyG/g2core fixtures，不能共用 Grbl shape。

| Controller | 操作對應（保留原順序） |
| --- | --- |
| Grbl | write('?')；writeln('$C')；command('homing'/'unlock'/'sleep')；writeln('$'/'$$'/'$#'/'$G'/'$I'/'$N')；ControllerModal refresh 依序 writeln('$#'), writeln('$$') |
| Grbl overrides | feed_override/spindle_override 各 -10,-1,1,10,0；rapid_override 25,50,100,0 |
| Marlin | menu writeln('M105'/'M114'/'M115')；hotend command('gcode', 'M104 S{deg}') 再 command('gcode','M105')；bed M140 S{deg} 再 M105；不可自行「修正」既有 settings dialog 協定 |
| Smoothie | write('?')；command('homing'/'unlock')；writeln('help'/'$#'/'$G')；settings refresh writeln('$#') |
| TinyG | writeln('?')；queue flush 依序 writeln('!%'), writeln('{"qr":""}')；reset write ASCII 0x04；command('unlock')；writeln('h'/'$sys'/'$$'/'$test'/'$defa=1') |
| TinyG motors | enable command('gcode','{me:{timeout}}')（實際字串為插值數字，如 {me:10}），再 command('gcode','{pwr:n}')；disable {md:0} 再 {pwr:n} |
| Marlin/Smoothie/TinyG overrides | feed_override/spindle_override -10,-1,1,10,0；TinyG 額外 rapid_override 100,50,25 |

每個可送命令 control 以表格驅動測試：ready、disconnected、workflow running/paused、controller alarm/locked、disabled、rerender、keyboard activation。**不是所有 controller 的 gates 都相同**；expected allow/deny 取原 source，保存到 fixture，不能一律禁止 running 時 override。

## 固定執行步驟

1. 在父 task 的 test file 建上述輸入/输出 oracle；controller command/write/writeln 分別 spy。需要特殊 gate 的 fixture明列原因。
2. 使用真 index/body（只 mock transport/heavy resource）測 action，不能直接呼叫待測 method 略過 disabled UI；keyboard/click 都測一次與禁止狀態。
3. 測 events A→B、partial report、wrong controller type、mount→unmount→mount、late timeout；每個 event setup 都有對應 cleanup，活躍 listener 數回 baseline。
4. 長按用 fake timers：500ms delay、floor(1000/15) interval；release/blur/disabled/unmount 後零新增 command。不要透過 state updater 送命令。
5. 改 function/chrome/Tonic 後重跑相同 oracle；有意修 bug 必須單列 before failure/new expected，不可只更新 snapshot。
6. 跑父 task test path、eslint、build，以及 09a 適用 browser case；記 evidence 後才 completed。

R5 彙整這些 command fixtures，並不重複實作所有 widget tests。任何 controller fixture 尚缺、browser 未驗證、事件 cleanup 未證明，均不得宣稱整體 regression 已確保。

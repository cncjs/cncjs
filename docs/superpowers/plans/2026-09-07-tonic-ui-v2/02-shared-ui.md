# 02 — Tonic 元件與 Widget 合約 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 建立直接使用 Tonic 的可執行替換規則與 function Widget 外框。

**Architecture:** 以共用 Widget 與低风险 consumers 作 pilot，保留仍有 consumers 的 legacy 家族至最後一批完成。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic UI 2.15.0、TanStack React Query 4.44.0、Redux、Stylus、Jest 29、Webpack 5。

**Spec:** [設計與約束](00-design.md)。檔案範圍見 [inventory](inventory.md)。

## Global Constraints

- JavaScript only；不新增 TypeScript、CSS modules 或 Sass。自訂樣式使用既有 Stylus；Tonic 本身的 props/token/theme 照其 API 使用。
- 保留 Node >=18、React 18 與 Query v4；本輪不升 React 19 / Query v5，不升控制器協定與 Three.js。
- 使用 i18next 處理所有新增／修改的使用者文字，含 aria-label。
- 有 Tonic 對應的通用元件直接 import `@tonic-ui/react`；不能以永久 re-export 或自製同功能 wrapper 當作完成。
- 只轉 React class components；非 React 類別（WidgetConfig、History、ShuttleControl、Three.js 邏輯）不因語法掃描而重寫。
- 所有 HTTP server state 的新遷移使用 useQuery/useMutation；Socket.IO/controller 指令仍由既有傳輸層處理。
- 每個 task 先建立行為測試／基準，再修改、跑指定檢查；只 stage 該 task 的檔案。若沒有提交授權，留下可 review 的 diff 與建議 commit message。

---


**Prerequisite:** F1、F2。

## Task U1a/U1b：宣告式 Widget 架構（細化版優先）

依 [02a — Widget state](details/02a-widget-state.md) 的 D1–D4 執行；它取代初稿的 mirrored minimized map/reducer。

- [ ] D1：registry capabilities、pure bulk update、穩定 snapshot tests。
- [ ] D2：config hydration 通知、Provider actions、group ids hook。
- [ ] D3：16 個 chrome consumers + function WidgetHost；Visualizer 保持無 chrome。
- [ ] D4：group function components、Workspace toolbar，移除所有 widgetMap/component instance 控制。

minimized 的唯一來源是既有 config，Provider 僅持有 transient fullscreen；不複製一份 minimized state 再同步回 config。最終仍以 props 傳 `{minimized,isFullscreen,onMinimizedChange,onToggleFullscreen}`。

D3/D4 同一可交付整合單位；不能只改父層控制就交付。先跑 [R1/R2](09-regression-gates.md) 的全 shell/Workspace 回歸，不以單個 pilot 替代 16 個真 index 的覆蓋。

## Task U2：通用 primitives 的第一批直接替換

**Scope:** inventory「直接替換」家族；先選 `src/app/widgets/Spindle/Spindle.jsx` 和 `src/app/widgets/GCode/GCode.jsx` 作代表，其他 consumers 在各 widget task 中完成。建立 `src/app/widgets/Spindle/__tests__/Spindle.test.jsx`。

- [ ] 對每一種舊 props 記錄實際用法：Button 的 btnStyle/btnSize/componentClass，Checkbox label/inputRef，GridSystem width/breakpoints，InputGroup addons。
- [ ] 逐 callsite 直接改 Tonic。以下為結構範例，值與 callback 沿用來源檔，不做盲目全域字串替換：

```jsx
import { Button, Checkbox, Flex, Input, TextLabel } from '@tonic-ui/react';

const controls = (
<>
<Button type="button" disabled={!enabled} onClick={onApply}>
  {i18n._('Apply')}
</Button>
<Checkbox checked={checked} onChange={event => onCheckedChange(event.target.checked)}>
  {label}
</Checkbox>
<Flex align="center">
  <TextLabel htmlFor={inputId}>{label}</TextLabel>
  <Input id={inputId} value={value} onChange={onChange} />
</Flex>
</>
);
```

- [ ] btnStyle 到 variant 的對照以 Tonic `button/Button.js` / `styles.js` 支援值與實際畫面決定；不把 primary/emphasis/flat 當成跨 library 同義。ButtonToolbar 用 Flex，不新增同名本地 wrapper。
- [ ] GridSystem 12 欄改 Grid/Flex 的明確模板或寬度，保留 576/768/992/1200/1600 breakpoints。不要直接假設 Tonic theme 的 breakpoint 陣列等同舊 Provider。
- [ ] Spindle 測原有啟停與數值提交 callbacks，GCode 測資料呈現；窄版／寬版、light/dark 截圖比對。
- [ ] 將每個家族尚未遷移 consumers 留在 execution log；不要求本 task 移除全部 legacy 檔案。

## Task U3：modal/menu/form/notification 遷移合約

**Read:** `src/app/components/Modal/*`, `ModalTemplate/*`, `Validation/*`, `Notifications/*`, `src/app/lib/portal.jsx`, `src/app/hooks/useToast.js`。
**Pilot Modify:** `src/app/widgets/Custom/modals/SettingsModal.jsx`（以 inventory 實際路徑核對），及其呼叫者。測試 `src/app/widgets/Custom/__tests__/SettingsModal.test.jsx`。

- [ ] 將舊 Modal compound elements 換 Tonic imports；`show` → `isOpen`、`showCloseButton` → `isClosable`；overlay click、Esc、focus-lock 顯式設定，不沿用 Tonic 預設猜行為。
- [ ] 單個 widget 的 modal 開關優先 local state；本來用 portal 的允許繼續使用。不要為 Tonic 新建第二套 ModalProvider/ModalRoot。
- [ ] 舊 Validation 不是 Tonic form engine 的等價物。使用既有 react-final-form 加 Tonic fields，保持 validation timing、初始值、dirty/cancel/submit 行為；只在被遷移的表單修改。
- [ ] Notifications UI 轉 Tonic Toast/Alert，使用現有 app useToast 保存 error/warning persistent、info/success 五秒規則。若來源是瀏覽器 OS notification，保留該 domain side effect。
- [ ] 測試 submit success 才 close、failure 保留輸入、Cancel 不送 request、nested modal 關閉順序與 focus restoration、overlay/escape 一致。

**Gate:** pilot 可操作；後續 tasks 有核實過的 replacement 範例；不新增永久通用 UI wrapper。全部 consumers 完成後由 08 刪除 legacy Modal/Dropdown/Validation 等。

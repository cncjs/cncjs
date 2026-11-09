# V3-DA — 原生 Dropdown / Autocomplete consumer 評估

日期：2026-10-07。Baseline HEAD：`acd13bde`（評估期間的工作樹含 V3-T／FIX-003 未提交變更，與本評估無關）。
本檔是 [10-tonic-ui-v3-alpha](10-tonic-ui-v3-alpha.md) 遺留項「Dropdown/Autocomplete feature substitutions remain separate work」的評估結果，不含任何 source 變更。

## 1. 已安裝 API 實測（`@tonic-ui/react@3.0.0-alpha.1`）

讀安裝版 source，非憑記憶：

| 元件 | 檔案 | 性質 |
| --- | --- | --- |
| `Dropdown` / `DropdownButton` / `DropdownToggle` / `DropdownChip` | `dist/esm/dropdown/` | 通用 popover/dropdown 家族，**不是** select。`DropdownChip` 是多選 chip 呈現。 |
| `Autocomplete` | `dist/esm/autocomplete/Autocomplete.js` | 可搜尋單選（input + 清單）。 |
| `AutocompleteInput`（預設 renderInput） | `dist/esm/autocomplete/AutocompleteInput.js` | 以 `InputControl` 實作的文字輸入，支援 `disabled` / `error` / `placeholder` / `required` / `name`，含 clear button。 |

`Autocomplete` 完整 props（source：`Autocomplete.js:46-69`）：`items`、`value`、`defaultValue`、`onChange`、`getItemLabel`、`renderItem`、`renderInput`、`renderContent`、`filterItems`、`inputValue`/`onInputChange`、`isClearable`、`isLoading`、`autoHighlight`、`closeBehavior`（`restore`／`clear`／`keep`）、`selectOnFocus`、`matchWidth`、`placement`、`portalled`、`onOpen`／`onClose`／`onHighlightChange`、`slots`／`slotProps`。

鍵盤：`Menu` 走 `MenuContent.js:137-155`（ArrowDown／ArrowUp／Home／End），`Autocomplete` 由 `useAutocompleteState` 管理 highlight。

## 2. 現有 select-like consumers（全 repo）

| # | 位置 | 形式 | 選項性質 | 可搜尋價值 |
| --- | --- | --- | --- | --- |
| 1 | `widgets/Connection/Connection.jsx:598,654`（port／baud） | `Menu`+`MenuButton`(`matchWidth`,width100%)+`MenuList` | port：裝置清單，可長；baud：約 10 個固定值 | port：**高**（P2 記錄兩者原本不可搜尋）；baud：低 |
| 2 | `widgets/Axes/DisplayPanel.jsx:250-273`（`AxisCommandMenu`） | 本地 `Menu`/`MenuToggle` wrapper，`onSelect` clone | WCS／go-to／zero 指令 | 無（指令，非資料） |
| 3 | `widgets/Axes/Keypad.jsx` | `MenuButton` | 單位／速度 | 無 |
| 4 | `widgets/Autolevel/index.jsx` | `MenuButton` | 固定少量 | 無 |
| 5 | `widgets/Macro/modals/NewMacro.jsx`、`EditMacro.jsx` | `MenuButton` | 固定少量 | 無 |
| 6 | `widgets/Tool/Tool.jsx:167` | Tonic `Select`（真 select） | 固定少量 | 無 |
| 7 | `widgets/Visualizer/PrimaryToolbar.jsx:126,161` | `MenuButton`（WCS、3D options） | 固定少量／選項清單 | 無 |
| 8 | `widgets/Visualizer/SecondaryToolbar.jsx:348` | `MenuButton`（machine profile） | `/api/machines` 清單 | 低至中（取決於機器數） |
| 9 | `widgets/Visualizer/WorkflowControl.jsx` | `MenuButton` | 固定少量 | 無 |
| 10 | `widgets/Axes/Settings/ShuttleXpress.jsx:66`、`widgets/Webcam/modals/SettingsModal.jsx:89` | Tonic `Select` | 固定少量 | 無 |
| 11 | `pages/Administration/*/{Users,Machines,Macros,Commands}` | `MenuButton` ghost | row action menu，非 select | 無 |

## 3. 契約比較（唯一高價值候選：Connection serial port）

現行 port selector 契約（`Connection.jsx:598-611` + `Connection.test.jsx`）：

- trigger：`role=button`，accessible name = `Serial port`；`width 100%`；`variant="secondary"`。
- 選中值：`{lock icon}{label}`；無值時 placeholder `Choose a port`。
- 清單：`role=menu` / `role=menuitem`；項目含 label、可選 `Manufacturer: …` 副行、`connected` 鎖頭。
- 空狀態：`No ports available` 文字。
- disabled：`isDisconnected && !isFetchingSerialPorts` 時不可開。
- 鍵盤：ArrowDown/ArrowUp 焦點移動、Escape 關閉、focus return（測試 `Connection.test.jsx:203-218`）。
- 副作用：選取只呼叫 `input.onChange(value)` + `config.set('connection.serial.path', value)`。

`Autocomplete` 對應能力：

| 契約 | Autocomplete 支援 | 差異／風險 |
| --- | --- | --- |
| 搜尋／過濾 | ✅ `filterItems` + input 輸入 | 新的互動，原本沒有 |
| 空狀態 | ✅ `renderContent` 回 `null` 可隱藏 popup，或用 `renderContent` 自繪空文字 | 需自訂才等同現行文字 |
| 副行（manufacturer）＋鎖頭 | ✅ `renderItem` | 直接可做 |
| 選中值顯示（含鎖頭前綴） | ⚠️ input 顯示 `getItemLabel(value)` 文字 | trigger 上的鎖頭前綴需自訂 `renderInput` |
| accessible name | ⚠️ `AutocompleteInput` 轉 `inputProps`；`aria-label` 由 `renderInput` 傳入 | 需明確指定，否則失去 `Serial port` 名稱 |
| disabled | ✅ `AutocompleteInput` 支援 `disabled`（需經 `renderInput`） | — |
| Escape／focus return | ✅ `closeBehavior` + `onClose` | 行為需重新驗證（不再是 menu 語義） |
| `matchWidth` | ✅ | 等同現值 |
| 測試角色 | ❌ 由 `button`/`menu`/`menuitem` 變為 `combobox`/`listbox`/`option` | **現行測試必須改寫**，不是等價替換 |
| 鍵盤測項 | ⚠️ highlight 由 hook 管理 | ArrowDown/Up、Enter 需重新以新角色驗證 |

## 4. 決策

1. **Dropdown 家族：不採用。** 沒有 consumer 需要它的能力（popover 型 dropdown／chip 多選）；現行 `Menu` 已提供 toggle + list + item 與鍵盤支援。採用只會增加無收益的 surface。
2. **Autocomplete：只有一個值得的 slice — Connection serial port selector。** 理由：裝置清單是唯一「長且需要搜尋」的資料集，且 P2 曾明確記錄兩個 selector 原本不可搜尋。
3. **不採用**：baud rate（約 10 個固定值）、Visualizer machine profile（清單短、且屬 Visualizer toolbar 契約）、Axes/Macro/Workflow/Administration 選單（固定少量或非 select 語義，`Menu` 正確）。
4. **Tonic `Select` 既有用法維持**（ShuttleXpress／Webcam／Tool）：短固定清單用原生 select 語義最正確。

## 5. 若執行 slice 的前置條件（尚未執行）

- 這是**行為契約變更**：trigger 由 button 變文字輸入，測試角色與鍵盤測項需整組改寫，並保留：disabled gating、空狀態、manufacturer 副行、鎖頭、`config.set` 唯一副作用、Escape/blur 回復語義。
- 需先在測試中建立 RED（現行 menu 契約不存在於 Autocomplete），再實作。
- 需 browser 驗證（focus、輸入過濾、清單捲動）——依 browser hard rule 由指定 model 執行，不在本評估內。
- 建議 ID：`V3-DA1`（獨立 slice），依賴本評估。

## 6. 未執行／未宣稱

本檔只做唯讀評估：未改任何 source、未改測試、未建 browser evidence、未宣稱任何 gate 通過。
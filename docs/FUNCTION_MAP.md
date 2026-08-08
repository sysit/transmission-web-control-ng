# Transmission Web Control — 功能地图（老版 → 新版对照）

> 来源：老版页面逐个截图识别（<lab-host>:9091）+ 老版源码权威核对
> （`src/tr-web-control/script/system.js`、`template/*.html`、`template/*.json`）。
> 用途：新版（React + Ant Design）对照老版逐页面补齐功能与图标。
> 生成日期：2026-08-08

---

## 1. 页面结构总览

| 区域 | 老版 (EasyUI) | 新版 (React) | 状态 |
|------|--------------|--------------|------|
| 入口 | `index.html` / `index.mobile.html` | `index.html`（HashRouter） | ✅ |
| 主布局 | `layout` + `panel.main` | `DashboardPage` | ✅ |
| 左侧树 | `.easyui-tree` | `SidebarTree` | ✅ |
| 主表格 | `.easyui-datagrid` | `TorrentTable` | ✅ 已补齐 22 列 |
| 底部状态栏 | `#statusBar` | `StatusBar` | ✅ |
| 详情面板 | `torrent-attribute` 抽屉 + 5 个左向 Tab | `TorrentDetailPanel` 抽屉 + 5 Tab | ✅ |
| 设置对话框 | `dialog-system-config` 7 Tab | `SettingsDialog` 6 Tab | ⚠️ 缺 User Labels |
| 工具栏 | `#toolbar` | `DashboardPage` 顶部按钮组 | ✅ |

---

## 2. 左侧导航树

老版节点（`system.js` / 截图 01-main）：
`全部 (n)` → `正在下载 (n)` `正在做种 (n)` `已暂停 (n)` `正在校验 (n)` `活跃 (n)` `错误 (n)` `警告 (n)`
`服务器` → 各 tracker
`目录` → 数据目录树（嵌套）
`统计` → `累计` / `当前`（上传、下载、文件数、会话数、活跃时间）

新版 `SidebarTree.tsx`：全部/下载/做种/暂停/校验/活跃/错误/警告 + 服务器 + 目录 + 统计(累计/当前 5 项)。
**结论：结构完全一致 ✅**（节点 id 与 key 需对齐：老版 `all`/`downloading`/`sending`/`paused`/`check`/`actively`/`error`/`warning`/`servers`/`folders`/`statistics`）。

---

## 3. 工具栏按钮

老版 `#toolbar`（截图 01 + inspect.mjs）：
- Add torrent(s)（添加种子）
- Config（设置）
- Extensions/plugins（扩展插件）
- Queue（队列：置顶/上移/下移/置底）
- About（关于）
- Mobile UI（移动版）
- 右侧：RPC 连接状态 / 刷新按钮

新版 `DashboardPage` 顶部：添加种子 / 设置 / 扩展下拉 / 队列下拉 / 关于 / 刷新 / 全选等。
**结论：按钮集合对应 ✅**（图标已从老版拷贝，iconfont md5 一致）。

---

## 4. 主表格列定义

权威来源：`template/torrent-fields.json`（22 个字段，`statusCode` 隐藏）：

| # | 老版 field | 宽度 | 新版 | 说明 |
|---|-----------|------|------|------|
| 1 | `ck` (checkbox) | 30 | ✅ checkbox | |
| 2 | `name` | 300 | ✅ name | 前带状态图标 |
| 3 | `totalSize` | 80 | ✅ totalSize | 右对齐 |
| 4 | `percentDone` | 70 | ✅ percentDone | 进度条 |
| 5 | `remainingTime` | 100 | ✅ eta | |
| 6 | `uploadRatio` | 60 | ✅ uploadRatio | |
| 7 | `status` | 60 | ✅ statusCol | 老版文本/图标，新版 Tag |
| — | `statusCode` | 隐藏 | — | 内部字段 |
| 8 | `seederCount` | 60 | ✅ seederCount | 老版显示 `44 (12)` 含 peersGettingFromUs |
| 9 | `leecherCount` | 60 | ✅ leecherCount | |
| 10 | `rateDownload` | 80 | ✅ rateDownload | |
| 11 | `rateUpload` | 80 | ✅ rateUpload | |
| 12 | `completeSize` | 80 | ✅ completeSize | |
| 13 | `uploadedEver` | 80 | ✅ uploadedEver | |
| 14 | `addedDate` | 130 | ✅ addedDate | |
| 15 | `id` | 30 | ✅ idCol | |
| 16 | `queuePosition` | 30 | ✅ queuePosition | |
| 17 | `trackers` | 100 | ✅ trackersCol | |
| 18 | `downloadDir` | 200 | ✅ downloadDir | |
| **19** | **`activityDate`** | **130** | **❌ 缺** | Last activity |
| **20** | **`labels`** | **130** | **❌ 缺** | 标签（RPC `labels` 字段） |
| **21** | **`doneDate`** | **130** | **❌ 缺** | 完成时间 |

**差距：新版缺 `activityDate`、`labels`、`doneDate` 3 列。**
老版支持：列头右键显示/隐藏 + 拖拽调整宽度 + 排序。新版已实现显隐 + resize + 排序 ✅。

---

## 5. 右键上下文菜单

老版 `system.js showContextMenu('torrent-list')`：

```
Start / Pause
─────────────────
Rename / Remove / Recheck
─────────────────
More Peers (reannounce) / Change Download Dir / Copy Path
─────────────────
Queue: Move to Top / Up / Down / Bottom
─────────────────
Copy Magnet Link
─────────────────  (仅 config.nav.labels 开启时)
Set Labels
```

新版 `TorrentContextMenu.tsx`：
```
Start / Stop
Verify / Recheck（⚠️ 两者都调 torrent-verify，重复）
More Peers
Rename / Change Download Dir
Copy Path / Copy Magnet Link
Queue (children: top/up/down/bottom)
Set Speed Limit（老版无此项，属详情 Config Tab 内容）
Remove / Remove & Data（老版 Remove 弹确认框带"删除本地数据"复选）
```

**差距：**
1. ⚠️ `verify` 与 `recheck` 重复（同调 `torrent-verify`）→ 应合并为老版的 `recheck`。
2. 缺 `Set Labels` 项（老版条件显示）。
3. 分组顺序与老版不一致。
4. `Remove/Remove&Data` 拆两项为合理增强，保留。

---

## 6. 详情面板（点击种子行展开）

老版 `torrent-attribute.html`：左向 Tab（headerWidth 105）：
`常规` / `服务器` / `文件` / `用户` / `设置`

- **常规（Info）**：Name, Download Dir(+改目录/复制路径图标), Status, Hash(copyable),
  Error(红), Total Size, Added, Remaining(size+time), Downloaded, ↓Speed, ↑Speed,
  Leechers, Seeders, Uploaded, Ratio, Creator, Created, Comment, Pieces 图。
  → 新版 `InfoTab.tsx` **逐字段一致 ✅**。
- **服务器（Trackers）**：`torrent-attribute-servers-fields.json` → 新版 `TrackersTab.tsx` ✅。
- **文件（Files）**：文件树/列表 → 新版 `FilesTab.tsx` ✅。
- **用户（Peers）**：`torrent-attribute-users-fields.json` → 新版 `PeersTab.tsx` ✅。
- **设置（Config）**：Download/Upload Limit、Seed Ratio、Seed Idle、Peer Limit。
  → 新版 `ConfigTab.tsx` **逐字段一致 ✅**。

---

## 7. 设置对话框（Config）

老版 `dialog-system-config.html` 7 个 Tab：

| Tab | 老版内容 | 新版 SettingsDialog | 状态 |
|-----|---------|---------------------|------|
| Basic Information | 下载目录选择器+剩余空间、Incomplete dir、`.part` 后缀、启动即开始、磁盘缓存、完成脚本、配置目录 | ✅ basic | |
| Network | 加密、端口+随机端口+Test Port、UPnP、μTP/DHT/LPD/PEX、Blocklist(+Update) | ✅ network | |
| Limit | 下行/上行限速、全局/单种子 Peer 数、做种比例、闲置做种、Stalled 队列 | ✅ limit | |
| Alt speeds | 备用限速+时间表+星期 | ✅ altspeed | |
| Folders Dictionary | **数据目录↔标签自动匹配字典（textarea）** | ✅ folders（textarea） | |
| More | 侧栏显示服务器/剩余空间、允许编辑路径、语言、刷新间隔、默认删除本地数据、RPC Path | ✅ more | |
| **User Labels** | **用户自定义标签 datagrid（name/description/color）** | ✅ labels（UserLabelsTab） | |

**差距：缺 User Labels Tab；Folders Tab 缺自动匹配字典。**

---

## 8. 添加种子对话框

老版 `dialog-torrent-add.html`：
- 下载目录 Select + **"设为默认目录" 复选框**
- 种子文件上传（多选）
- 种子 URL / Magnet 链接
- 自动开始复选框

新版 `AddTorrentDialog.tsx`：下载目录 + 上传 + URL + 自动开始。
**差距：缺 "设为默认目录" 复选框。**

---

## 9. 状态栏

老版：↓/↑ 速度 | Torrents n | Active n | Paused n | 剩余空间 | 右侧：Transmission 版本, RPC 版本, Web Control 版本。
新版 `StatusBar.tsx`：相同 + 运行时长。**✅ 一致（增强项）。**

---

## 10. 图标

已从老版拷贝：`src/assets/iconfont/`（iconfont.css 与老版 md5 相同 `bdae705887bff440b841bf53b298ab5c`），
`LegacyIcon` 语义映射到 `tr-icon-*`。**图标 100% 一致，无需再拷贝。**

---

## 11. 待办差距清单（新版需修改）

| 优先级 | 差距 | 状态 |
|--------|------|------|
| P0 | 表格缺 `activityDate`/`labels`/`doneDate` 列 | ✅ 已实现（TorrentTable 3 列 + `labels` 入 TORRENT_FIELDS_BASE 与 rpc-types），已部署验证 |
| P1 | 右键菜单 verify/recheck 重复 | ✅ 已合并为 recheck，分组顺序对齐老版，已部署验证 |
| P1 | 添加对话框缺"设为默认目录" | ✅ 已实现（AddTorrentDialog 复选框 + `session-set download-dir`） |
| P1 | 右键菜单缺 Set Labels | ✅ 已实现（torrent-set labels），已部署验证 |
| P2 | 设置对话框缺 User Labels Tab | ✅ 已实现（UserLabelsTab：name/desc/color 表格 + 添加入口，存 localStorage） |
| P2 | Folders Tab 缺自动匹配字典 | ✅ 已实现（Folders Dictionary textarea，每行一个目录路径，存 localStorage） |

> 已部署至 <transmission-host>:9091 验证：22 列表头全部渲染，右键菜单分组与老版一致，
> 设置对话框 7 Tab 与老版完全对应（Basic/Network/Limit/Alt Speeds/Folders Dictionary/More/User Labels）（2026-08-08）。
> 微调：Labels 列按用户标签调色板渲染为彩色 chip（匹配老版 formetTorrentLabels 视觉）。

---

## 12. 老版其他对话框（新版未实现，功能地图留档）

- `dialog-torrent-remove-confirm.html` — 删除确认（带"删除本地数据"复选）→ 新版拆成 Remove/Remove&Data 两项。
- `dialog-torrent-rename.html` — 重命名 → 新版用 prompt。
- `dialog-torrent-changeDownloadDir.html` — 改下载目录 → 新版用 prompt。
- `dialog-torrent-changeSpeedLimit.html` — 限速 → 新版在 Config Tab。
- `dialog-torrent-setLabels.html` — 设标签。
- `dialog-system-replaceTracker.html` — 替换 Tracker。
- `dialog-export-config.html` / `dialog-import-config.html` — 配置导出/导入 → 新版 SettingsDialog 已有 Export。
- `dialog-about.html` — 关于 → 新版已有。
- `dialog-auto-match-data-folder.html` / `-dictionary.html` — 目录自动匹配。

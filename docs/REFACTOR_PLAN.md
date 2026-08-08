# Transmission Web Control — 重构计划

## 1. 现状总结

### 1.1 代码规模

| 类别 | 文件数 | 代码行数 | 说明 |
|------|--------|----------|------|
| 核心 JS | 7 | ~5,880 | system.js 占 3,579 行（单体巨石） |
| 自定义 CSS | 4 | ~648 | base.css 占 372 行 |
| HTML 模板 | 19 | ~4,389 | 对话框模板，AJAX 加载 |
| i18n JSON | 17 | — | 17 种语言翻译 |
| Vendored 库 | 大量 | — | jQuery/EasyUI/Mobile 等 |

### 1.2 技术栈现状

| 维度 | 现状 | 版本/年份 |
|------|------|-----------|
| JS 框架 | jQuery | 1.12.4 (2016) |
| 桌面 UI | jQuery EasyUI | 1.5.x (已停更) |
| 移动端 UI | jQuery Mobile | 1.4.5 (2014, 已废弃) |
| 模块化 | 无，全局对象 | `window.system`, `window.transmission` |
| 构建工具 | 无 | 手工 minify，Gruntfile 已 gitignored |
| 类型检查 | 无 | 纯 ES5 |
| 包管理 | Vendor 拷贝 | 依赖手工放入 `script/` |
| 状态管理 | 全局可变对象 + localStorage | system.config 直接修改 |

### 1.3 现有架构（保留价值部分）

```
index.html ──加载顺序──> jQuery → EasyUI → public.js → transmission.js
                         → transmission.torrents.js → system.js → config.js → plugin.js
```

- **transmission.js** (342 行) — RPC 客户端，设计合理，Session-Id 挑战-响应、Basic Auth、方法分发。**可复用核心。**
- **transmission.torrents.js** (540 行) — 种子数据模型，"recently-active" 增量拉取策略设计合理。**可复用核心。**
- **RPC 协议** — Transmission RPC API 是稳定契约，不随 UI 改变。

---

## 2. 核心问题

### 2.1 架构层面

| # | 问题 | 严重程度 | 影响 |
|---|------|----------|------|
| 1 | **Desktop/Mobile 双代码库** | 严重 | system.js(3579行) + system.mobile.js(777行) 独立维护，功能不同步 |
| 2 | **全局对象污染** | 严重 | `system`, `transmission` 挂 window，任何代码可修改，无隔离 |
| 3 | **无模块化** | 严重 | 依赖 `<script>` 标签加载顺序，无法 tree-shaking，无法按需加载 |
| 4 | **system.js 单体巨石** | 严重 | 3579 行包含 UI 初始化、事件绑定、对话框逻辑、配置管理、自动刷新、右键菜单、i18n 等所有职责 |
| 5 | **Prototype 污染** | 高 | public.js 扩展 `String.prototype`、`Number.prototype`，破坏原生类型 |

### 2.2 技术债

| # | 问题 | 说明 |
|---|------|------|
| 6 | jQuery EasyUI 已死 | 无更新、无社区、无 TypeScript 类型、样式过时 |
| 7 | jQuery Mobile 已废弃 | 2014 年最后一版，jQuery 团队已放弃 |
| 8 | ES5 语法 | 无 async/await、无 const/let、无箭头函数、无解构 |
| 9 | 模板字符串写死 | HTML 片段通过 AJAX 动态加载，无编译时检查 |
| 10 | 无类型安全 | RPC 返回数据结构无校验，字段拼写错误运行时才发现 |

### 2.3 用户体验

| # | 问题 |
|---|------|
| 11 | 无响应式设计 — 桌面/移动端是两套完全独立的代码 |
| 12 | 无 PWA 支持 — 无法离线访问、无法安装到桌面 |
| 13 | 暗色模式靠 CSS 主题 hack，不系统 |
| 14 | 轮询机制 — 每 N 秒全量请求，无法实时推送 |

---

## 3. 目标架构

### 3.1 技术选型

| 维度 | 选型 | 理由 |
|------|------|------|
| 框架 | **React 18+** | 生态最成熟、TypeScript 支持最好、PT 用户群体技术接受度高 |
| 构建 | **Vite 5** | 秒级 HMR、ESM 原生、生产构建快 |
| 语言 | **TypeScript 5** | RPC 数据结构可定义 interface，编译期拦截错误 |
| UI 组件 | **Ant Design 5.x** | `Table` / `Tree` / `Modal` / `Menu` 开箱即用，专为数据密集型 Dashboard 设计；内置虚拟滚动；暗色模式通过 `ConfigProvider` theme algorithm 一键切换；企业级复杂组件无需手工组装 |
| 虚拟滚动 | **antd Table virtual** | Ant Design 5.x Table 内置虚拟滚动（`virtual` prop），支持万级种子列表流畅渲染；Tree 组件 5.x 同样支持 `virtual`；无需额外引入 react-window 或 @tanstack/virtual |
| 样式方案 | **CSS Modules + Ant Design tokens** | 自定义样式用 CSS Modules（Vite 内置支持）；组件主题统一通过 Ant Design `ConfigProvider` 的 `token`/`algorithm` 控制；不引入 Tailwind 避免与 antd cssinjs 的潜在冲突和双层主题维护 |
| 状态管理 | **Zustand** | 轻量、TypeScript 友好、无 boilerplate |
| 数据请求 | **TanStack Query** | 缓存、自动重试、轮询/重验证、与 RPC 轮询天然匹配 |
| 路由 | **React Router** | 对话框/面板可用路由表达，URL 状态持久化 |
| i18n | **i18next + react-i18next + antd locale** | ICU 格式、命名空间拆分、社区标准；antd 组件内置文本通过 `antd/locale/*` 同步切换 |
| 测试 | **Vitest + Playwright** | 与 Vite 集成、组件测试 + E2E |
| 桌面端 | **Tauri** (可选 Phase 3) | 将 WebUI 打包为独立桌面应用，与 Transmission 后端分离部署 |

### 选型对比：Ant Design vs 备选方案

| 维度 | Ant Design 5.x | shadcn/ui + Tailwind | MUI |
|------|---------------|---------------------|-----|
| Table 组件 | ✅ 内置排序/筛选/多选/展开行/虚拟滚动/行拖拽 | ⚠️ 需手工组装 TanStack Table + 样式 | ✅ DataGrid（Pro 版付费） |
| Tree 组件 | ✅ 虚拟滚动、拖拽、右键菜单、搜索过滤 | ❌ 需从零实现 | ✅ RichTreeView |
| Modal/Drawer | ✅ 开箱即用、表单集成、步骤式对话框 | 🟡 基础 Dialog，复杂交互需自建 | ✅ 开箱即用 |
| 暗色模式 | ✅ `darkAlgorithm` 一键切换，所有组件自动适配 | 🟡 Tailwind `dark:` 变体，需逐组件维护 | ✅ 主题系统内置 |
| Bundle 影响 | ⚠️ 按需 treeshaken ~150-200KB gzipped | ✅ 基础 bundle 极小 | ⚠️ ~120-180KB gzipped |
| 适配本项目的开发速度 | ⚡️ 最快 — 核心组件直接使用 | 🐢 慢 — 大量手工组装 | ⚡️ 快，但略慢于 antd |

**选择 Ant Design 的核心理由**：本项目 70% 的 UI 交互集中在 Table + Tree + Modal 三种组件，这些恰是 Ant Design 经过 10 年打磨的最强项。相比 shadcn/ui 需要手工从零组装 TanStack Table + ContextMenu + Tree，Ant Design 的 "开箱即用" 能节省 Phase 2-3 约 40-50% 的开发时间。Bundle 增大是可接受的代价，因为应用嵌入在 Transmission 本地 HTTP server 中，非首次加载场景。

### 3.2 目标分层

```
src/
├── entry/
│   └── main.tsx                    ← 应用入口，挂载 React
├── app/
│   ├── App.tsx                     ← 根组件：ConfigProvider + Router + QueryClientProvider
│   ├── routes.ts                   ← 路由定义
│   └── theme.ts                    ← Ant Design token/algorithm 主题配置
├── pages/
│   ├── dashboard/
│   │   ├── DashboardPage.tsx       ← 主面板（种子列表 + 树 + 统计）
│   │   ├── TorrentTable.tsx        ← antd Table（virtual prop）+ 列定义
│   │   ├── SidebarTree.tsx         ← antd Tree（virtual prop）+ 分类统计
│   │   └── StatusBar.tsx           ← 底部状态栏
│   ├── torrent-detail/
│   │   ├── TorrentDetailPage.tsx   ← 种子详情面板（antd Tabs）
│   │   ├── PeersTab.tsx
│   │   ├── TrackersTab.tsx
│   │   ├── FilesTab.tsx
│   │   └── SpeedChart.tsx
│   └── settings/
│       ├── SettingsPage.tsx
│       └── sections/
├── components/                     ← 跨页面共享的封装/组合组件
│   ├── TorrentContextMenu.tsx      ← 种子右键菜单（antd Dropdown）
│   ├── BatchOperationBar.tsx       ← 批量操作工具栏
│   └── TrackerStatusBadge.tsx      ← Tracker 状态标签
├── core/                           ← 从旧代码迁移的纯逻辑（无 UI 依赖）
│   ├── rpc/
│   │   ├── transmission-client.ts  ← 迁移自 transmission.js（纯函数 + type）
│   │   ├── torrent-model.ts        ← 迁移自 transmission.torrents.js
│   │   ├── rpc-types.ts            ← RPC 请求/响应 interface 定义
│   │   └── session.ts              ← Session-Id 管理
│   ├── config/
│   │   ├── config-store.ts         ← Zustand store，替代全局 system.config
│   │   └── defaults.ts             ← 默认配置常量
│   └── i18n/
│       ├── index.ts                ← i18next 初始化
│       └── locales/                ← 从旧 i18n/*.json 迁移
├── hooks/
│   ├── useTorrents.ts              ← TanStack Query hook，封装种子数据
│   ├── useRpcMutation.ts           ← RPC 写操作 hook
│   ├── useAutoReload.ts            ← 自动刷新逻辑
│   └── useTheme.ts                 ← 主题切换（antd ConfigProvider theme）
├── lib/
│   ├── format.ts                   ← 从 public.js 迁移（不污染 prototype）
│   └── constants.ts
└── styles/
    ├── global.css                  ← 少数全局样式（布局、滚动条、覆盖）
    └── dashboard.module.css        ← Dashboard 页面特定样式（CSS Modules）
```

### 3.3 数据流

```
User Action
  → React Component (event handler)
    → Zustand Action / TanStack Query Mutation
      → transmission-client.exec(method, args)
        → POST ../rpc (X-Transmission-Session-Id)
          → Response
            → TanStack Query cache update
              → React re-render (only changed components)
```

---

## 4. 分阶段计划

### Phase 0: 基础设施搭建（预估 2-3 天）

**目标**：项目骨架可运行，开发环境就绪。

| 步骤 | 内容 | 产出 |
|------|------|------|
| 0.1 | `npm create vite@latest` 初始化，选 React + TypeScript | 项目骨架 |
| 0.2 | 安装核心依赖：`antd`, `@ant-design/icons`, `@ant-design/pro-table`(可选), `zustand`, `@tanstack/react-query`, `i18next`, `react-i18next`, `react-router` | package.json |
| 0.3 | 配置 Vite：alias（`@/` → `src/`）、proxy（开发时指向 Transmission 实例）、CSP nonce 占位 | vite.config.ts |
| 0.4 | 初始化 Ant Design：`ConfigProvider` 包裹、主题 token 定制（色系、紧凑模式 `compactAlgorithm`）、`antd/locale/zh_CN` 集成 | `app/theme.ts` + `App.tsx` |
| 0.5 | 配置 TypeScript strict mode、路径别名 | tsconfig.json |
| 0.6 | 配置 CSS Modules：Vite 内置支持，`.module.css` 文件即用 | 无需额外配置 |
| 0.7 | 配置 Vitest + Playwright | 测试基础设施 |
| 0.8 | 配置 ESLint + Prettier | 代码规范 |
| 0.9 | 配置 antd 按需加载（tree shaking 默认支持，无需 babel-plugin-import） | 验证构建产物 |

**注意**：Ant Design 5.x 通过 cssinjs 实现样式，tree shaking 自动按需加载，不再需要 `babel-plugin-import`。包体积控制策略：
- 静态文件部署在 Transmission 本地 HTTP server，首次加载 ~200KB gzipped（antd 按需）在局域网/本机环境下可接受
- 如有需要，可配置 CDN 外部加载 antd（`vite.config.ts` 的 `build.rollupOptions.external`），将 antd 走 jsdelivr CDN，进一步减小构建体积

### Phase 1: 核心 RPC 层迁移（预估 3-4 天）

**目标**：`core/rpc/` 模块完成，TypeScript 类型覆盖 Transmission RPC 协议，可独立测试。

| 步骤 | 内容 | 旧文件 → 新文件 |
|------|------|-----------------|
| 1.1 | 定义 Transmission RPC 协议 TypeScript 类型 | 新：`core/rpc/rpc-types.ts` |
| 1.2 | 迁移 `transmission.js` RPC 客户端 | `transmission.js` → `core/rpc/transmission-client.ts` |
| 1.3 | 迁移 `transmission.torrents.js` 种子数据模型 | `transmission.torrents.js` → `core/rpc/torrent-model.ts` |
| 1.4 | 实现 Session-Id 管理（409 挑战响应） | 新：`core/rpc/session.ts` |
| 1.5 | 编写 RPC 层单元测试（mock fetch） | `core/rpc/__tests__/` |
| 1.6 | 编写 TanStack Query wrapper（`useTorrents` hook） | 新：`hooks/useTorrents.ts` |

**验收标准**：
- RPC 调用可在 Node.js 环境通过单元测试验证
- `torrent-get` 请求/响应完全类型安全
- `recently-active` 增量拉取逻辑正确迁移

### Phase 2: 基础 UI 框架（预估 3-4 天）

**目标**：主布局、导航、种子列表可展示真实数据。**核心依赖 Ant Design 组件，大幅减少手工组装。**

| 步骤 | 内容 | Ant Design 组件 | 说明 |
|------|------|----------------|------|
| 2.1 | 实现 App shell：`Layout`（header/sider/content/footer） | `Layout`, `Menu`, `Breadcrumb` | 响应式单代码库，`Layout.Sider` 的 `breakpoint` + `collapsed` 适配移动端 |
| 2.2 | 实现侧边栏分类树（全部/下载中/做种中/暂停/错误/警告） | `Tree` (`virtual` prop) | 从 RPC 数据动态统计各分类数量，`Tree.DirectoryTree` |
| 2.3 | 实现种子列表表格：**虚拟滚动**排序、多选、右键菜单 | `Table` (`virtual` prop, `rowSelection`, `onRow` contextMenu) | `virtual` 属性直接启用虚拟滚动，支持万级种子列表；无需额外引入 react-window |
| 2.4 | 实现顶部工具栏（添加种子、设置、主题切换、语言切换） | `Space`, `Button`, `Upload`, `Switch`, `Select` | antd `Upload` 组件支持拖拽添加 .torrent 文件 |
| 2.5 | 实现底部状态栏（连接状态、上传/下载速度、磁盘空间） | `Layout.Footer` + `Statistic` | `Statistic` 组件格式化速度/容量数值 |
| 2.6 | 实现自动刷新机制 | `useAutoReload` hook + TanStack Query `refetchInterval` | 替代 `system.autoReloadTimer` |
| 2.7 | 实现响应式断点：移动端侧边栏变 Drawer，表格列自适应 | `Drawer`, `Layout` breakpoint | antd 内置响应式 API，无需手写媒体查询 |

**验收标准**：
- 桌面端 (>=1024px) 完整功能可用：Table 虚拟滚动 10000+ 行流畅
- 移动端 (<768px) 基本浏览可用，侧边栏折叠为 Drawer
- 种子数据实时刷新
- 主题切换（light/dark）通过 `ConfigProvider` theme algorithm 一键切换
- 虚拟滚动性能：10000 行种子列表滚动帧率 ≥ 30fps

**虚拟滚动实施细节**：
```tsx
// antd Table 虚拟滚动配置示例
<Table
  columns={torrentColumns}
  dataSource={torrents}
  rowKey="id"
  virtual          // ← 启用虚拟滚动
  scroll={{ y: 600 }}
  rowSelection={{ type: 'checkbox', ... }}
  onRow={(record) => ({
    onContextMenu: (e) => handleContextMenu(e, record),
  })}
/>
```
- antd 5.x Table `virtual` prop 内部使用 `rc-virtual-list`，动态行高支持
- Tree 组件同理：`<Tree treeData={data} height={400} virtual />`
- 无需额外安装 `react-window`、`@tanstack/virtual` 等第三方虚拟滚动库

### Phase 3: 对话框 & 交互迁移（预估 4-5 天）

**目标**：从旧 HTML 模板迁移全部对话框到 React 组件。

| 步骤 | 内容 | 旧模板 → 新组件 |
|------|------|-----------------|
| 3.1 | 系统配置对话框（~1,200 行 HTML）| `dialog-system-config.html` → `SettingsPage.tsx` |
| 3.2 | 添加种子对话框（含文件选择）| `dialog-torrent-add.html` + `addfile.html` → `AddTorrentDialog.tsx` |
| 3.3 | 种子属性面板（详情、Peers、Trackers、文件）| `torrent-attribute.html` → `TorrentDetailPage.tsx` + Tabs |
| 3.4 | 批量操作：替换 Tracker | `dialog-system-replaceTracker.html` → `ReplaceTrackerDialog.tsx` |
| 3.5 | 批量操作：修改下载目录 | `dialog-torrent-changeDownloadDir.html` → Dialog |
| 3.6 | 批量操作：限速设置 | `dialog-torrent-changeSpeedLimit.html` → Dialog |
| 3.7 | 批量操作：自动匹配数据目录 | `dialog-auto-match-data-folder.html` → Dialog |
| 3.8 | 删除确认、重命名、标签设置 | 其余模板 → 对应组件 |
| 3.9 | 关于对话框 | `dialog-about.html` → `AboutDialog.tsx` |
| 3.10 | 种子右键菜单 | `system.contextMenus` → 组件内 ContextMenu |

**验收标准**：
- 所有旧对话框功能在新 UI 中可用
- 表单验证完整
- 错误状态正确处理

### Phase 4: i18n 迁移 & 配置迁移（预估 2-3 天）

**目标**：多语言支持完整，用户配置平滑迁移。

| 步骤 | 内容 |
|------|------|
| 4.1 | 迁移 17 种语言 JSON 到 i18next 格式（ICU MessageFormat） |
| 4.2 | 拆分语言包为命名空间：`common`, `torrent`, `dialog`, `settings` |
| 4.3 | 实现语言检测（浏览器偏好 → localStorage → 默认） |
| 4.4 | 实现配置迁移：从旧 localStorage 读取 → 写入新 Zustand store |
| 4.5 | 实现配置导出/导入（兼容旧版 JSON 格式） |
| 4.6 | 实现插件扩展点（替代 `plugin.js` 的 switch-case） |

### Phase 5: 高级特性（预估 3-4 天）

**目标**：超越旧版，提供新能力。

| 步骤 | 内容 |
|------|------|
| 5.1 | **PWA 支持**：Service Worker、离线缓存、manifest.json |
| 5.2 | **暗色模式增强**：antd `darkAlgorithm` + 系统偏好自动跟随（`matchMedia('prefers-color-scheme')`）+ 手动切换开关持久化到 localStorage |
| 5.3 | **WebSocket 实时推送**（需 Transmission 4.x+，回退到轮询） |
| 5.4 | **种子搜索**（本地过滤 + antd Table 列排序/筛选 + 全局搜索框） |
| 5.5 | **速度图表**（Recharts 或 antd Charts，历史传输速率可视化） |
| 5.6 | **Tracker 状态聚合视图**（PT 站分组、状态统计） |
| 5.7 | **键盘快捷键**（批量操作、导航、antd Table 行选择快捷键） |
| 5.8 | **紧凑模式**：antd `compactAlgorithm`，适合小屏幕/高信息密度场景 |

### Phase 6: 测试 & 优化（预估 3-4 天）

**目标**：生产就绪质量。

| 步骤 | 内容 |
|------|------|
| 6.1 | 单元测试：`core/rpc/` 100% 覆盖 |
| 6.2 | 组件测试：关键交互路径（Table 虚拟滚动、Tree 展开/选中、Modal 表单提交） |
| 6.3 | E2E 测试：添加种子 → 查看详情 → 修改配置 → 删除种子（Playwright） |
| 6.4 | 性能优化：antd 按需 tree shaking 验证、Code splitting（`React.lazy` 路由级拆分）、虚拟滚动性能基准测试（10000+ 行） |
| 6.5 | 可访问性审计（WCAG 2.1 AA）— antd 组件基础可访问性已内置，聚焦自定义交互 |
| 6.6 | Cross-browser 测试（Chrome/Firefox/Safari） |
| 6.7 | 构建产物大小检查：与 Phase 0.9 的基准对比，目标 JS < 300KB gzipped（antd 按需后）, CSS（cssinjs 运行时）< 30KB |
| 6.8 | 生产构建验证 + CSP 配置（需处理 antd cssinjs `<style>` 标签的 nonce 注入） |

### Phase 7: 发布 & 迁移（预估 2 天）

**目标**：用户可平滑切换到新版。

| 步骤 | 内容 |
|------|------|
| 7.1 | 构建输出适配 Transmission WebUI 目录结构 |
| 7.2 | 更新 `install-tr-control.sh` 安装脚本 |
| 7.3 | 编写 CHANGELOG + 升级指南 |
| 7.4 | GitHub Release，保留旧版在 `legacy` 分支 |
| 7.5 | 兼容模式：保留旧版入口 `index.original.html` → 新版 `index.html` |

---

## 5. 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| Transmission RPC 协议变更 | 低 | 高 | RPC 类型定义集中管理，协议版本检测 |
| 用户拒绝 UI 大改 | 中 | 中 | 保留旧版入口，antd `compactAlgorithm` 紧凑模式提供接近旧版的信息密度 |
| 17 种语言翻译质量下降 | 中 | 低 | Phase 4 优先完成 en/zh_CN/zh_TW，其余社区贡献 |
| Ant Design bundle 体积过大 | 中 | 中 | 按需 tree shaking + CDN 外部加载方案（Phase 0.9）；本地 HTTP server 场景对 bundle 大小不敏感 |
| antd cssinjs 与 CSP nonce 集成 | 中 | 中 | antd 5.x `ConfigProvider` 的 `getPopupContainer` 和 `StyleProvider` 支持 `nonce` 注入；Phase 6.8 专项验证 |
| antd 虚拟滚动大列表性能不如预期 | 低 | 中 | 内部使用 `rc-virtual-list`，久经考验；Phase 6.4 做 10000+ 行基准测试，如有瓶颈可降级到 `react-window` |
| 旧 localStorage 数据迁移失败 | 中 | 中 | Phase 4 实现迁移函数 + fallback + 错误提示 |

---

## 6. 总时间线预估

```
Phase 0: ████░░░░░░░░░░░░░░░░  2-3 天  基础设施
Phase 1: ░░░░████████░░░░░░░░  3-4 天  RPC 层
Phase 2: ░░░░░░░░░░██████░░░░  3-4 天  基础 UI（antd 开箱即用节省 1-2 天）
Phase 3: ░░░░░░░░░░░░░░░░████  4-5 天  对话框迁移
Phase 4: ░░░░░░░░░░░░░░░░░███  2-3 天  i18n + 配置
Phase 5: ░░░░░░░░░░░░░░░░░░██  3-4 天  高级特性
Phase 6: ░░░░░░░░░░░░░░░░░░░█  3-4 天  测试优化
Phase 7: ░░░░░░░░░░░░░░░░░░░░  2   天  发布
        ─────────────────────
        合计: 19-27 天（单人全职）
```
注：Phase 2 从 4-5 天缩减至 3-4 天，因 Ant Design 的 `Table`(virtual)、`Tree`(virtual)、`Menu`、`Layout` 均为开箱即用的业务组件，不需要如原方案那样手工组装 TanStack Table + ContextMenu + Tree。

## 7. 不可变原则

1. **RPC 协议不变** — Transmission RPC API 是稳定契约
2. **核心数据结构不变** — torrent-get 返回字段保持一致
3. **安装方式不变** — 仍然放入 Transmission web 目录，无需独立部署
4. **向后兼容** — 旧版入口保留，配置可迁移
5. **渐进式替换** — `transmission.js` 的 RPC 逻辑设计良好，可直接 TypeScript 化而非重写

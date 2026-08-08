# 构建文档

## 环境要求

| 工具 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18.x | LTS 版本即可 |
| npm | 9.x | 随 Node.js 附带 |

不需要全局安装任何包，所有依赖锁定在 `package.json` 中。

## 快速开始

```sh
# 1. 进入项目目录（仓库根目录）
cd ~/projects/transmission-web-control-ng

# 2. 安装依赖（仅首次）
npm install

# 3. 构建生产版本
npm run build
```

产物在 `dist/` 目录下：

```
dist/
├── index.html
├── manifest.json
└── assets/
    ├── index-XXXXXXXX.js
    ├── antd-XXXXXXXX.js
    ├── react-vendor-XXXXXXXX.js
    ├── query-XXXXXXXX.js
    ├── DashboardPage-XXXXXXXX.js
    ├── SettingsPage-XXXXXXXX.js
    ├── TorrentDetailPage-XXXXXXXX.js
    ├── index-XXXXXXXX.css
    └── format-XXXXXXXX.js
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (localhost:3000) |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npx tsc --noEmit` | 仅 TypeScript 类型检查 |
| `npx vitest run` | 运行全部测试 |
| `npx vitest` | 测试监听模式 |

## 开发模式

```sh
npm run dev
```

开发服务器：
- 监听 `localhost:3000`
- 支持 HMR（热模块替换）
- 自动代理 `/transmission/rpc` → `http://localhost:9091`

需要本地运行 Transmission 或修改 `vite.config.ts` 中的代理目标。

## 构建产物说明

所有资源路径使用**相对路径**（`./assets/...`），因此不依赖任何特定 URL 前缀，适配 Transmission 的任意挂载路径。

非 JS/CSS 的静态资源可以放在 `public/` 目录下，构建时原样复制到 `dist/`。

## 依赖项

```
生产依赖（打包进产物）：
  antd 6.x          UI 组件库
  @ant-design/icons  图标库
  react 18.x         UI 框架
  react-dom 18.x     DOM 渲染
  react-router-dom   前端路由
  @tanstack/react-query  数据获取 & 自动刷新
  zustand           客户端状态管理
  i18next + react-i18next  国际化

开发依赖（不进入产物）：
  typescript 5.x    类型检查
  vite 6.x          构建工具
  @vitejs/plugin-react  JSX 编译
  vitest            测试框架
  @testing-library/react  组件测试
  jsdom             DOM 模拟环境
```

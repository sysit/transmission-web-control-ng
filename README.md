# Transmission Web Control NG

一个现代化的 **Transmission BitTorrent WebUI** —— 使用 **React 19 + TypeScript** 对经典的
[transmission-web-control](https://github.com/ronggang/transmission-web-control)（EasyUI 版）进行的
**技术重构**。在复刻老版界面外观与操作习惯的同时，增强了 **PT（Private Tracker）管理**能力。

> ### ⭐ 特别致谢
>
> 本项目 **fork 自** [ronggang/transmission-web-control](https://github.com/ronggang/transmission-web-control)。
> 该上游项目（已归档，2025-06-01）的界面设计与功能逻辑为本项目奠定了坚实的基础。
> 我们对其进行了完整的技术重构（jQuery/EasyUI → React + TypeScript），
> **特此向原作者 ronggang 及所有上游贡献者致以诚挚的感谢！** 🙏

---

## 特性

- 🎨 **忠实复刻老版 EasyUI 视觉**——12px 紧凑字体、26×26 工具栏按钮、EasyUI 蓝渐变标题栏、斑马纹表格、iconfont 图标字形，约 99% 视觉保真
- 🖥️ **22 列种子数据表格**——进度条、Ratio、Label 彩色 chip、列宽拖拽调整、表头右键显隐、分页（10~5000/页）
- 🌲 **侧边栏分类树**——全部 / 下载中 / 暂停 / 做种 / 检查 / 活动 / 错误 / 警告 + 按 Tracker 分组（PT 站聚合）
- ⚡ **PT 管理增强**——Tracker 状态分组、批量操作（启停/限速/设标签）、数据目录自动匹配字典
- 🖱️ **右键上下文菜单**——分组对齐老版：启动/暂停/删除（含删除本地数据）/校验/重命名/改目录/设标签/替换 Tracker…
- 🎯 **拖拽上传**——直接把种子文件或磁力链接拖进窗口即可添加
- 🌗 **5 套主题 + 暗色模式**——default(蓝) / gray / metro(绿) / bootstrap / black，一键切换
- 🔄 **自动刷新**——可配置轮询间隔，实时更新种子状态与速度
- 🌍 **国际化**——`zh_CN` / `en` 双语

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 19 + TypeScript + Vite 6 |
| UI | Ant Design 6（ConfigProvider 主题化对齐老版 EasyUI） |
| 数据 | TanStack Query（RPC 拉取/缓存）+ Zustand persist（应用配置） |
| 路由 | react-router-dom 7（HashRouter，适配嵌入式 HTTP server） |
| i18n | react-i18next（`zh_CN` / `en`） |
| 图表 | recharts（详情面板曲线）+ react-resizable（列宽拖拽） |

**纯客户端运行**：无服务端构建步骤，应用由 Transmission 自带的嵌入式 HTTP server 直接提供，
通过相对路径 `../rpc` 与 RPC API 通信（自动完成 409 session-id 握手与 Basic auth）。

---

## 用户安装使用（无需构建工具）

> 本节面向**普通用户**——只需要在你的 Transmission 主机上装好界面，不需要 Node.js 或任何构建工具。

### 一键安装

```sh
wget https://github.com/sysit/transmission-web-control-ng/releases/download/v1.0.0/install.sh -O - | sudo bash
```

> 该命令从 GitHub Release 下载 `install.sh` 并直接以 `sudo bash` 执行。
> 因 stdin 非终端，脚本默认执行**非交互安装**。系统需具备 `wget`/`curl` 与 `sudo`。

脚本自动完成：

1. **检测 web 目录**——依据 `transmission-daemon` 版本自动选择
   `public_html/`（≥ 3.0）或 `web/`（< 3.0），也支持
   `TRANSMISSION_WEB_HOME` 环境变量或命令行参数指定目录；
2. **下载预构建包**并从 GitHub Release 解压安装；
3. **备份原界面**——原 `index.html` 保存为 `index.original.html`；
4. **清理重装**——重装时移除上次生成的残留文件，保证幂等。

### 使用

安装完成后，浏览器访问：

```
http://<transmission-host>:9091/transmission/web/
```

RPC 认证：使用与 Transmission 配置相同的凭据（在客户端 Settings → RPC 中设置）。

### 回滚到原版界面

需先保存 install.sh 再执行：

```sh
wget https://github.com/sysit/transmission-web-control-ng/releases/download/v1.0.0/install.sh -O install.sh
sudo bash install.sh revert
```

> 从 Release 下载的安装脚本源码位于 `release/install-tr-control-ng.sh`。

---

## 开发（面向开发者）

> 本节面向**开发者**——需要从源码构建、调试或二次开发。需要 Node.js 18+ 与 npm。

### 快速开始

```sh
npm install        # 安装依赖（仅首次）
npm run dev        # Vite 开发服务器
```

### 构建生产版本

```sh
npx vite build     # 生产构建 → dist/
```

产物在 `dist/`。将 `dist/` 内容原样拷贝到 Transmission 的 web 目录即可生效
（`public/tr-web-control/` 下的静态资产保留了老版相对路径，无需额外配置）。

### 部署到 Transmission 主机

```sh
npx vite build
scp -pr dist/* root@<host>:/usr/share/transmission/public_html/.
```

刷新或重启 Transmission 后访问 `http://<host>:9091/transmission/web/`。

### 测试与检查

```sh
npx tsc --noEmit   # 类型检查
npx vitest run     # 单元测试
npm run lint       # oxlint
```

### 目录结构

```
src/
├── app/            # App 外壳：主题 / Provider / 路由（HashRouter）
├── components/     # 复用组件：LegacyIcon、BatchOperationBar、右键菜单、拖拽区…
├── core/
│   ├── i18n/       # i18next 初始化 + 语言包
│   ├── rpc/        # Transmission RPC 客户端 + 类型（session / torrent model）
│   └── config/     # Zustand 持久化配置（localStorage: tr-web-control-config）
├── pages/
│   └── dashboard/  # 主页面：标题栏 + 工具栏 + 侧边栏树 + 种子表格 + 详情面板 + 状态栏
└── styles/         # global.css：设计 token + EasyUI 忠实复刻组件样式
```

---

## 致谢与许可证

- **上游项目**：[ronggang/transmission-web-control](https://github.com/ronggang/transmission-web-control)（已归档）
  —— 界面设计、功能逻辑与静态资产（logo、国旗、iconfont 字形等）的来源，**再次感谢**！
- 本项目基于上游进行技术重构，许可协议请参阅上游仓库的 LICENSE。

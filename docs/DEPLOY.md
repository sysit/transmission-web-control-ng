# 部署文档

## 原理

Transmission 内嵌了一个 HTTP 服务器，托管其 `web` 目录下的静态文件。部署就是**用构建产物替换这个目录的内容**。

> 目标机器**不需要** Node.js、npm 或任何额外运行时。只需要文件复制能力。

## 部署前准备

### 1. 找到 Transmission web 目录

```sh
# 常见位置，逐个试
ls /usr/share/transmission/web
ls /usr/local/share/transmission/web
ls /opt/transmission/web
ls /snap/transmission/common/web
ls ~/.config/transmission/web

# 或者通过进程查找
ps aux | grep transmission-daemon
# 看启动参数中是否有 --web-home 或 TRANSMISSION_WEB_HOME
```

### 2. 在开发机构建

```sh
cd ~/projects/transmission-web-control-ng
npm install    # 仅首次
npm run build  # 产物在 dist/
```

## 部署方式

### 方式一：直接复制（推荐）

```sh
# 在开发机上
scp -r dist/* user@nas:/usr/share/transmission/web/

# 或者目标机上
cp -r dist/* /usr/share/transmission/web/
```

### 方式二：使用在线安装脚本

```sh
# 安装 GitHub Release 的预构建版本（无需 Node/构建工具）
wget https://github.com/sysit/transmission-web-control-ng/releases/download/v1.0.0/install.sh -O - | sudo bash
```

或本地直接执行（脚本源码在 `release/install-tr-control-ng.sh`）。脚本会：
1. 自动检测 Transmission web 目录（版本感知：≥3.0 → `public_html`，<3.0 → `web`）
2. 下载预构建包并备份原始 `index.html` → `index.original.html`
3. 清理上次残留后安装（幂等）
4. 回滚：`sudo bash install.sh revert`

> 若需部署**本地刚构建**的 `dist/`，请用方式一（scp/cp）。

### 方式三：打包传输

```sh
# 开发机
tar -czf tr-web-control.tar.gz dist/

# 传到目标机后
tar -xzf tr-web-control.tar.gz
cp -r dist/* /usr/share/transmission/web/
```

## 验证

部署后访问 Transmission WebUI（默认 `http://<host>:9091`），应该看到新界面：

- 左侧分类树（全部 / 下载中 / 活动中 / 暂停 / 错误 / 警告）
- 中部种子列表（名称 / 大小 / 进度）
- 底部状态栏（种子数 / 速率）
- 右键菜单（开始 / 停止 / 删除）

## 回滚

```sh
# 如果之前用在线安装脚本装过
sudo bash install.sh revert   # 或本地: bash release/install-tr-control-ng.sh revert

# 手动回滚
cd /usr/share/transmission/web
cp index.original.html index.html
rm -rf assets/
```

## 注意事项

- **权限**：Transmission 需要对 web 目录下的文件有读权限。通常 `644` 即可。
- **SELinux**：部分 NAS 系统启用了 SELinux，如果页面空白，检查 `ls -lZ` 查看上下文。
- **Docker**：如果用 Docker 版 Transmission，挂载 web 目录或使用 `TRANSMISSION_WEB_HOME` 环境变量指向宿主机的 web 目录。
- **缓存**：部署后如果页面没变化，强制刷新浏览器（Ctrl+Shift+R）。

## Docker 部署示例

```yaml
# docker-compose.yml
services:
  transmission:
    image: linuxserver/transmission
    volumes:
      - ./dist:/usr/share/transmission/web:ro  # 只读挂载
      - ./config:/config
      - ./downloads:/downloads
    ports:
      - "9091:9091"
```

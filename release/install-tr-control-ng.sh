#!/bin/bash
# -----------------------------------------------------------------------------
# Transmission Web Control NG - Online Installer (for end users)
#
# Downloads the pre-built package from GitHub Release and installs it into the
# Transmission web directory. No Node.js / build tools required.
#
# One-line install:
#   wget https://github.com/sysit/transmission-web-control-ng/releases/download/v1.0.0/install.sh -O - | sudo bash
#
# Or download & run:
#   bash install.sh                  # interactive menu
#   bash install.sh <web_dir>        # specify web directory, then install
#   bash install.sh install          # install directly (non-interactive)
#   bash install.sh revert           # revert to original UI (non-interactive)
# -----------------------------------------------------------------------------

set -e

VERSION="v1.0.0"
PACK_NAME="tr-web-control-ng.tar.gz"
DOWNLOAD_URL="https://github.com/sysit/transmission-web-control-ng/releases/download/$VERSION/$PACK_NAME"

log()  { echo -e "$1"; }
ok()   { echo -e "\033[32m[ OK ] $1\033[0m"; }
error(){ echo -e "\033[31m[ERROR] $1\033[0m"; exit 1; }

# ---------------------------------------------------------------------------
# Detect the Transmission web directory. Priority:
#   1. command-line argument
#   2. TRANSMISSION_WEB_HOME environment variable
#   3. version-aware common install paths (>=3.0 -> public_html, <3.0 -> web)
#   4. ask the user
# ---------------------------------------------------------------------------
detect_web_dir() {
  if [ -n "$ARG_DIR" ] && [ -d "$ARG_DIR" ]; then
    echo "$ARG_DIR"; return 0
  fi

  if [ -n "$TRANSMISSION_WEB_HOME" ] && [ -d "$TRANSMISSION_WEB_HOME" ]; then
    echo "$TRANSMISSION_WEB_HOME"; return 0
  fi

  local bases="
    /usr/share/transmission
    /usr/local/share/transmission
    /var/lib/transmission-daemon
    /var/lib/transmission
    /opt/transmission
    /snap/transmission/common
    /var/packages/transmission/target/share/transmission"

  # Transmission >= 3.0 将 web UI 目录从 web/ 改名为 public_html/。
  # 默认优先 public_html(3.0+ 主流,旧版无此目录会自动落到 web);
  # 仅当明确探测到版本 < 3.0 时才切回 web。
  # 注意:某些版本的 transmission-daemon 把版本号写到 stderr,故用 2>&1 捕获。
  local web_dir_name="public_html"
  local ver=""
  if command -v transmission-daemon >/dev/null 2>&1; then
    ver=$(transmission-daemon -V 2>&1 | head -1)
    [ -z "$ver" ] && ver=$(transmission-daemon --version 2>&1 | head -1)
  fi
  if [ -z "$ver" ]; then
    for bin in /usr/bin/transmission-daemon /usr/local/bin/transmission-daemon; do
      [ -x "$bin" ] || continue
      ver=$("$bin" -V 2>&1 | head -1)
      [ -z "$ver" ] && ver=$("$bin" --version 2>&1 | head -1)
      [ -n "$ver" ] && break
    done
  fi
  local major
  major=$(printf '%s' "$ver" | grep -oE '[0-9]+' | head -1)
  if [ -n "$major" ] && [ "$major" -lt 3 ] 2>/dev/null; then
    web_dir_name="web"
  fi

  # 首选版本对应目录
  for base in $bases; do
    if [ -d "$base/$web_dir_name" ]; then
      echo "$base/$web_dir_name"; return 0
    fi
  done

  # 首选目录缺失时,两个名字都兜底尝试(public_html 优先,旧版无则落 web)
  for base in $bases; do
    for name in public_html web; do
      if [ -d "$base/$name" ]; then
        echo "$base/$name"; return 0
      fi
    done
  done

  echo ""
  printf "Could not auto-detect the Transmission web directory.\nPlease enter it (e.g /usr/share/transmission/public_html): "
  read -r custom
  if [ -d "$custom" ]; then
    echo "$custom"; return 0
  fi
  error "Directory '$custom' does not exist."
}

# ---------------------------------------------------------------------------
# Download the pre-built package from GitHub Release
# ---------------------------------------------------------------------------
download_package() {
  local tmp="$1"
  log "Downloading $PACK_NAME ($VERSION) ..."
  if command -v curl >/dev/null 2>&1; then
    # --retry-all-errors:网络抖动时自动重试,提升弱网环境成功率
    curl -fSL --retry 5 --retry-delay 3 --retry-all-errors \
      "$DOWNLOAD_URL" -o "$tmp/$PACK_NAME" \
      || error "Download failed. Check your network or the release URL."
  elif command -v wget >/dev/null 2>&1; then
    wget --tries=5 --timeout=60 "$DOWNLOAD_URL" -O "$tmp/$PACK_NAME" \
      || error "Download failed. Check your network or the release URL."
  else
    error "Could not find curl or wget, please install one."
  fi
}

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------
install_webui() {
  local web_dir tmp src

  web_dir=$(detect_web_dir)
  log "Transmission web directory: $web_dir"

  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT

  download_package "$tmp"

  log "Extracting $PACK_NAME ..."
  mkdir -p "$tmp/pkg"
  tar -xzf "$tmp/$PACK_NAME" -C "$tmp/pkg"
  src="$tmp/pkg"

  # Backup original index.html (only once)
  if [ -f "$web_dir/index.html" ] && [ ! -f "$web_dir/index.original.html" ]; then
    log "Backing up original index.html -> index.original.html"
    cp "$web_dir/index.html" "$web_dir/index.original.html"
  fi

  # 清理上次安装生成的残留文件,保证重装幂等(与 revert 清理范围一致,
  # 不动 index.original.html 备份)
  rm -rf "$web_dir/assets" "$web_dir/tr-web-control"
  rm -f "$web_dir/favicon.svg" "$web_dir/icons.svg" \
        "$web_dir/logo.png" "$web_dir/logo-white.png" "$web_dir/manifest.json"

  log "Installing Transmission Web Control NG ..."
  cp -r "$src/." "$web_dir/"

  ok "Installation completed!"
  log "Open http://<this-host>:9091 in your browser (Transmission RPC port)."
  log "To revert, run: bash install.sh revert"
}

# ---------------------------------------------------------------------------
# Revert to the original Transmission web UI
# ---------------------------------------------------------------------------
revert_install() {
  local web_dir
  web_dir=$(detect_web_dir)
  log "Transmission web directory: $web_dir"

  if [ -f "$web_dir/index.original.html" ]; then
    log "Restoring original Transmission web UI ..."
    cp "$web_dir/index.original.html" "$web_dir/index.html"
    rm -rf "$web_dir/assets"
    rm -f "$web_dir/favicon.svg" "$web_dir/icons.svg" \
          "$web_dir/logo.png" "$web_dir/logo-white.png" "$web_dir/manifest.json"
    rm -rf "$web_dir/tr-web-control"
    ok "Original web UI restored."
  else
    error "No backup found (index.original.html missing). Cannot revert."
  fi
}

# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------
main() {
  local arg1="${1:-}"
  local arg2="${2:-}"

  # Explicit action: install / revert (non-interactive, no stdin needed)
  if [ "$arg1" = "install" ]; then
    install_webui; return
  fi
  if [ "$arg1" = "revert" ]; then
    revert_install; return
  fi

  # Directory passed as first argument -> install into it
  if [ -n "$arg1" ] && [ "$arg1" != "install" ] && [ "$arg1" != "revert" ]; then
    ARG_DIR="$arg1"
    install_webui; return
  fi

  # Non-interactive default: if stdin is not a TTY (e.g piped from wget),
  # install directly so `wget ... | sudo bash` just works.
  if [ ! -t 0 ]; then
    install_webui; return
  fi

  # Interactive menu
  echo ""
  echo "Transmission Web Control NG - Online Installer"
  echo "Version: $VERSION"
  echo "================================================="
  echo "1) Install"
  echo "2) Revert to original"
  echo "3) Exit"
  printf "Choose [1-3]: "
  read -r choice
  case "$choice" in
    1) install_webui ;;
    2) revert_install ;;
    3) echo "Bye."; exit 0 ;;
    *) echo "Invalid choice."; exit 1 ;;
  esac
}

main "$@"

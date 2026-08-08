#!/bin/sh
# -----------------------------------------------------------------------------
# Transmission Web Control - New UI Install Script
# Installs the React-based WebUI for Transmission BitTorrent client
# -----------------------------------------------------------------------------

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/../dist"

# Detect Transmission web directory
detect_web_dir() {
  # Common locations
  for dir in \
    /usr/share/transmission/web \
    /usr/local/share/transmission/web \
    /opt/transmission/web \
    /snap/transmission/common/web \
    "$HOME/.config/transmission/web"; do
    if [ -d "$dir" ]; then
      echo "$dir"
      return 0
    fi
  done

  # Ask user if not found
  echo ""
  echo "Could not auto-detect Transmission web directory."
  printf "Please enter the path: "
  read -r custom_dir
  if [ -d "$custom_dir" ]; then
    echo "$custom_dir"
    return 0
  fi
  echo "Error: Directory '$custom_dir' does not exist."
  return 1
}

# Main install
install_webui() {
  WEB_DIR=$(detect_web_dir)
  if [ $? -ne 0 ]; then
    exit 1
  fi

  echo "Transmission web directory: $WEB_DIR"

  if [ ! -d "$DIST_DIR" ]; then
    echo "Error: Build output not found at $DIST_DIR"
    echo "Run 'npm run build' in the repo root first."
    exit 1
  fi

  # Backup original index.html
  if [ -f "$WEB_DIR/index.html" ] && [ ! -f "$WEB_DIR/index.original.html" ]; then
    echo "Backing up original index.html..."
    cp "$WEB_DIR/index.html" "$WEB_DIR/index.original.html"
  fi

  # Install new UI (all assets: js/css, tr-web-control iconfont/logo, favicon, manifest)
  echo "Installing Transmission Web Control..."
  cp -r "$DIST_DIR/." "$WEB_DIR/"

  echo ""
  echo "Done! Transmission Web Control has been installed."
  echo "To revert: run this script and choose option 2."
}

# Revert to original
revert_install() {
  WEB_DIR=$(detect_web_dir)
  if [ $? -ne 0 ]; then
    exit 1
  fi

  if [ -f "$WEB_DIR/index.original.html" ]; then
    echo "Restoring original Transmission web UI..."
    cp "$WEB_DIR/index.original.html" "$WEB_DIR/index.html"
    rm -rf "$WEB_DIR/assets"
    rm -f "$WEB_DIR/favicon.svg" "$WEB_DIR/icons.svg" \
          "$WEB_DIR/logo.png" "$WEB_DIR/logo-white.png" "$WEB_DIR/manifest.json"
    rm -rf "$WEB_DIR/tr-web-control"
    echo "Done! Original web UI restored."
  else
    echo "No backup found (index.original.html missing). Cannot revert."
    exit 1
  fi
}

# Menu
echo ""
echo "Transmission Web Control (New UI) Installer"
echo "============================================"
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

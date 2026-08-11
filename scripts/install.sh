#!/usr/bin/env bash
#
# WordLex one-line installer for Linux and macOS.
#
#   Linux/macOS:
#     curl -fsSL https://raw.githubusercontent.com/vedesh-padal/wordlex/main/scripts/install.sh | bash
#
# Behavior:
#   - Linux: installs the native package (.deb on Debian/Ubuntu/Mint,
#     .rpm on Fedora/RHEL) when one is available for the distro, and falls
#     back to the AppImage otherwise (Arch, other distros).
#   - macOS: downloads the matching .dmg and copies WordLex.app to /Applications.
#
# To pin a specific version (defaults to latest):
#     VERSION=2.0.0 curl -fsSL ... | bash

set -euo pipefail

REPO="vedesh-padal/wordlex"
VERSION="${VERSION:-latest}"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { printf "${GREEN}[wordlex]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[wordlex] warning:${NC} %s\n" "$*" >&2; }
die()  { printf "${RED}[wordlex] error:${NC} %s\n" "$*" >&2; exit 1; }

# ─── Release resolution ──────────────────────────────────────────────────────
release_assets() {
    local url out
    if [ "$VERSION" = "latest" ]; then
        url="https://api.github.com/repos/${REPO}/releases/latest"
    else
        url="https://api.github.com/repos/${REPO}/releases/tags/v${VERSION}"
    fi
    out="$(curl -fsSL "$url" 2>/dev/null)" \
        || die "Could not resolve the WordLex ${VERSION} release on GitHub. Check the version and your network connection."
    printf '%s' "$out"
}

# find_asset <regex> -> prints the first matching browser_download_url.
# <regex> is matched against the bare URL, so use a trailing `$` to pin the
# asset filename (e.g. '_amd64\.deb$').
find_asset() {
    local regex="$1"
    printf '%s' "$RELEASE_JSON" \
        | grep -oE '"browser_download_url": *"[^"]*"' \
        | sed -E 's/.*"browser_download_url": *"([^"]*)"/\1/' \
        | grep -E "$regex" \
        | head -n1
}

download() { curl -fSL -o "$1" "$2"; }

# ─── Linux ───────────────────────────────────────────────────────────────────
# Asset filenames are architecture-specific:
#   x86_64/amd64 -> *_amd64.deb | *-1.x86_64.rpm | *_amd64.AppImage
#   aarch64/arm64 -> *_arm64.deb | *-1.aarch64.rpm | *_aarch64.AppImage
case "$(uname -m)" in
    aarch64 | arm64)
        LINUX_DEB='_arm64\.deb$'
        LINUX_RPM='\.aarch64\.rpm$'
        LINUX_APPIMAGE='_aarch64\.AppImage$'
        ;;
    *)
        LINUX_DEB='_amd64\.deb$'
        LINUX_RPM='\.x86_64\.rpm$'
        LINUX_APPIMAGE='_amd64\.AppImage$'
        ;;
esac

install_appimage() {
    local target dest file
    target="$(find_asset "$LINUX_APPIMAGE")" || true
    [ -n "$target" ] || die "No AppImage asset found for $(uname -m) in the WordLex ${VERSION} release."

    dest="$HOME/Applications"
    mkdir -p "$dest"
    file="$dest/WordLex.AppImage"

    log "Downloading $(basename "$target")..."
    download "$file" "$target"
    chmod +x "$file"

    log "Running --install-cli to add WordLex to the app menu and PATH..."
    "$file" --install-cli || warn "Could not integrate WordLex into the desktop; you can still run it directly: $file"
    log "Installed. Launch with: $file"
}

install_linux() {
    local ext target tmp
    log "Detected architecture: $(uname -m)."
    if command -v apt-get >/dev/null 2>&1; then
        ext="deb"
        log "Detected a Debian/Ubuntu-based system (apt-get)."
    elif command -v dnf >/dev/null 2>&1; then
        ext="rpm"
        log "Detected a Fedora/RHEL-based system (dnf)."
    elif command -v yum >/dev/null 2>&1; then
        ext="rpm"
        log "Detected a RHEL-based system (yum)."
    else
        warn "No native package manager detected; using the AppImage instead."
        install_appimage
        return
    fi

    if [ "$ext" = "deb" ]; then
        target="$(find_asset "$LINUX_DEB")" || true
    else
        target="$(find_asset "$LINUX_RPM")" || true
    fi
    if [ -z "$target" ]; then
        warn "No ${ext} asset found in the release; falling back to the AppImage."
        install_appimage
        return
    fi

    command -v sudo >/dev/null 2>&1 || die "This installer needs sudo to install the ${ext} package."
    tmp="${TMPDIR:-/tmp}/wordlex-$(basename "$target")"
    log "Downloading $(basename "$target")..."
    download "$tmp" "$target"

    if [ "$ext" = "deb" ]; then
        if ! sudo apt-get install -y "$tmp"; then
            sudo dpkg -i "$tmp"
        fi
    else
        if command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y "$tmp"
        else
            sudo yum install -y "$tmp"
        fi
    fi
    rm -f "$tmp"
    log "Installed. Find WordLex in your application launcher."
}

# ─── macOS ───────────────────────────────────────────────────────────────────
install_macos() {
    local regex target tmp dmg vol
    case "$(uname -m)" in
        arm64) regex='_aarch64\.dmg$' ;;
        *)     regex='_x64\.dmg$' ;;
    esac
    target="$(find_asset "$regex")" || true
    [ -n "$target" ] || die "No macOS .dmg asset found for $(uname -m) in the WordLex ${VERSION} release."

    tmp="$(mktemp -d)"
    dmg="$tmp/WordLex.dmg"
    log "Downloading $(basename "$target")..."
    download "$dmg" "$target"

    log "Mounting the disk image..."
    vol="$(hdiutil attach -nobrowse -readonly "$dmg" | tail -n1 | awk -F'\t' '{print $NF}')"
    ditto "$vol/WordLex.app" "/Applications/WordLex.app"
    hdiutil detach "$vol" >/dev/null
    rm -rf "$tmp"

    log "Installed WordLex to /Applications. Launch it from Spotlight or Launchpad."
}

# ─── Main ────────────────────────────────────────────────────────────────────
case "$(uname -s)" in
    Linux)  OS="linux" ;;
    Darwin) OS="macos" ;;
    *) die "Unsupported operating system: $(uname -s). Windows users should run install.ps1 in PowerShell." ;;
esac

log "Resolving the WordLex ${VERSION} release..."
RELEASE_JSON="$(release_assets)"

if [ "$OS" = "linux" ]; then
    install_linux
else
    install_macos
fi

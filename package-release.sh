#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="openclaw-config-atlas-portable-$STAMP.tar.gz"
ARCHIVE_PATH="$DIST_DIR/$ARCHIVE_NAME"
TMP_DIR="$(mktemp -d)"
STAGE_DIR="$TMP_DIR/openclaw-config-atlas"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$DIST_DIR" "$STAGE_DIR"
cp "$ROOT_DIR/package.json" "$STAGE_DIR/"
cp "$ROOT_DIR/server.mjs" "$STAGE_DIR/"
cp "$ROOT_DIR/README.md" "$STAGE_DIR/"
cp "$ROOT_DIR/INSTALL-另一台电脑.md" "$STAGE_DIR/"
cp "$ROOT_DIR/package-release.sh" "$STAGE_DIR/"

cp -r "$ROOT_DIR/public" "$STAGE_DIR/public"

tar -czf "$ARCHIVE_PATH" -C "$TMP_DIR" openclaw-config-atlas
printf '%s\n' "$ARCHIVE_PATH"

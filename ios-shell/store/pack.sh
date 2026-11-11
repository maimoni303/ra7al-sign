#!/usr/bin/env bash
# يجمع تطبيق «متجر رحّال» من نواة الآيفون العامة: pack.sh <binary> <config.json> <out.ipa>
set -euo pipefail
BIN=$1; CFG=$2; OUT=$3; HERE=$(cd "$(dirname "$0")" && pwd)
W=$(mktemp -d); APP="$W/Payload/App.app"; mkdir -p "$APP"
cp "$BIN" "$APP/App"; chmod +x "$APP/App"
python3 "$HERE/../make_plist.py" "$CFG" "$APP/Info.plist"
cp "$HERE"/AppIcon*.png "$APP/"
OUTABS=$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT"); rm -f "$OUTABS"
(cd "$W" && zip -qry "$OUTABS" Payload)
rm -rf "$W"; echo "packed $OUTABS"

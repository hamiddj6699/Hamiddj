#!/usr/bin/env bash
set -euo pipefail

# Dropbox helper script: upload/download files using Dropbox API v2
# Requirements:
# - curl, jq
# - Environment variable DROPBOX_ACCESS_TOKEN must be set
# Usage examples:
#   Upload:   ./scripts/dropbox-upload.sh upload local/path/file.txt /Apps/pos-sdk-7220/file.txt
#   Download: ./scripts/dropbox-upload.sh download /Apps/pos-sdk-7220/file.txt local/path/file.txt

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2; exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2; exit 1
fi
if [[ -z "${DROPBOX_ACCESS_TOKEN:-}" ]]; then
  echo "Set DROPBOX_ACCESS_TOKEN environment variable" >&2; exit 1
fi

ACTION="${1:-}"
case "$ACTION" in
  upload)
    LOCAL_PATH="${2:-}"
    REMOTE_PATH="${3:-}"
    if [[ -z "$LOCAL_PATH" || -z "$REMOTE_PATH" ]]; then
      echo "Usage: $0 upload <local_path> <remote_path>" >&2; exit 1
    fi
    if [[ ! -f "$LOCAL_PATH" ]]; then
      echo "Local file not found: $LOCAL_PATH" >&2; exit 1
    fi
    echo "Uploading $LOCAL_PATH -> $REMOTE_PATH"
    RESPONSE=$(curl -sS -X POST https://content.dropboxapi.com/2/files/upload \
      --header "Authorization: Bearer $DROPBOX_ACCESS_TOKEN" \
      --header "Dropbox-API-Arg: {\"path\": \"$REMOTE_PATH\", \"mode\": \"add\", \"autorename\": true, \"mute\": false}" \
      --header "Content-Type: application/octet-stream" \
      --data-binary @"$LOCAL_PATH")
    echo "$RESPONSE" | jq .
    ;;
  download)
    REMOTE_PATH="${2:-}"
    LOCAL_PATH="${3:-}"
    if [[ -z "$REMOTE_PATH" || -z "$LOCAL_PATH" ]]; then
      echo "Usage: $0 download <remote_path> <local_path>" >&2; exit 1
    fi
    echo "Downloading $REMOTE_PATH -> $LOCAL_PATH"
    curl -sS -X POST https://content.dropboxapi.com/2/files/download \
      --header "Authorization: Bearer $DROPBOX_ACCESS_TOKEN" \
      --header "Dropbox-API-Arg: {\"path\": \"$REMOTE_PATH\"}" \
      --output "$LOCAL_PATH"
    echo "Saved to $LOCAL_PATH"
    ;;
  ls)
    REMOTE_FOLDER="${2:-/}"
    RESPONSE=$(curl -sS -X POST https://api.dropboxapi.com/2/files/list_folder \
      --header "Authorization: Bearer $DROPBOX_ACCESS_TOKEN" \
      --header "Content-Type: application/json" \
      --data "{\"path\": \"$REMOTE_FOLDER\"}")
    echo "$RESPONSE" | jq '.entries[] | {name: .name, path_lower: .path_lower, type: .\.tag}'
    ;;
  *)
    cat >&2 <<'USAGE'
Usage:
  dropbox-upload.sh upload <local_path> <remote_path>
  dropbox-upload.sh download <remote_path> <local_path>
  dropbox-upload.sh ls [remote_folder]

Environment:
  DROPBOX_ACCESS_TOKEN  OAuth2 bearer token with files.content.write/read scopes
USAGE
    exit 1
    ;;
 esac
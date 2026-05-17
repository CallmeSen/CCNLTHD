#!/bin/sh
set -eu

target="/usr/share/nginx/html/env.js"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

{
  printf 'window.__INVESTADVISOR_ENV__ = {\n'
  first=1
  env | sort | while IFS='=' read -r key value; do
    case "$key" in
      VITE_*)
        if [ "$first" -eq 0 ]; then
          printf ',\n'
        fi
        first=0
        printf '  "%s": "%s"' "$key" "$(json_escape "$value")"
        ;;
    esac
  done
  printf '\n};\n'
} > "$target"

#!/usr/bin/env sh
set -eu

base_url="${1:-}"

if [ -z "$base_url" ]; then
  echo "Usage: scripts/smoke-test.sh <base-url>" >&2
  exit 1
fi

curl --fail --silent --show-error "$base_url/api/health"
curl --fail --silent --show-error "$base_url/"

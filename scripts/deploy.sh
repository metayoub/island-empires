#!/usr/bin/env sh
set -eu

environment="${1:-}"

if [ "$environment" != "staging" ] && [ "$environment" != "production" ]; then
  echo "Usage: scripts/deploy.sh <staging|production>" >&2
  exit 1
fi

echo "Deploy hook for $environment"
echo "Configure this script with the target platform command before enabling automatic release."

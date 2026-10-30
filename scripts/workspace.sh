#!/usr/bin/env sh
# Git-only controls for Acode, Linux, macOS, and Git Bash on Windows.
# Never stages files, commits, stashes, resets, force-pushes, or installs packages.
set -eu
project_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
case "${1:-status}" in
  status)
    git status --short --branch
    ;;
  update)
    if [ -n "$(git status --porcelain)" ]; then
      echo 'Save and commit your changes before updating. Nothing was changed.' >&2
      exit 1
    fi
    git symbolic-ref --quiet HEAD >/dev/null || {
      echo 'Switch to a branch before updating.' >&2; exit 1;
    }
    git pull --ff-only
    ;;
  publish)
    branch=$(git symbolic-ref --quiet --short HEAD) || {
      echo 'Switch to a branch before publishing.' >&2; exit 1;
    }
    case "$branch" in
      main|master) echo 'Publish from a working branch, not the default branch.' >&2; exit 1 ;;
    esac
    if [ -n "$(git status --porcelain)" ]; then
      echo 'Uncommitted edits remain on this device; only existing commits will be pushed.' >&2
    fi
    git push --set-upstream origin "HEAD:refs/heads/$branch"
    ;;
  *)
    echo 'Usage: sh scripts/workspace.sh [status|update|publish]' >&2
    exit 1
    ;;
esac

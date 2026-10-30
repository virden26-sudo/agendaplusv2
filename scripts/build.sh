#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
npm --prefix "$project_dir" run android:debug
cd "$project_dir/android"
./gradlew testDebugUnitTest lintDebug --no-daemon

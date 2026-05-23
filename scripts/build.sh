#!/usr/bin/env bash
set -euo pipefail

# Helper script to run Gradle build locally. Ensure JAVA_HOME is set and Android SDK is available.
if [ -z "${JAVA_HOME:-}" ]; then
  echo "JAVA_HOME is not set. Please set it to your JDK installation path and re-run." >&2
  exit 1
fi

# Make gradlew executable
chmod +x gradlew || true

# Run a clean build
./gradlew clean build --no-daemon

# Run lint
./gradlew lintDebug --no-daemon || true

echo "Build and lint finished."

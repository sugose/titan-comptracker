#!/bin/bash
# dump-wrapper.sh
# List files to exclude from the dump below, one per line.
# These will be passed to dump.sh via --exclude.
# Paths are repo-relative (e.g. docs/TECHNICAL_PRODUCT_SPECIFICATION.md).

EXCLUDE_FILES=(
  # Add files to exclude here, one per line (repo-relative paths).
  # Example — uncomment to exclude a large file from dumps:
  # docs/conference/presentation.html
)

# --- Do not edit below this line ---

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ${#EXCLUDE_FILES[@]} -eq 0 ]; then
  bash "$SCRIPT_DIR/dump.sh"
else
  EXCLUDE_ARG=""
  for f in "${EXCLUDE_FILES[@]}"; do
    if [ -z "$EXCLUDE_ARG" ]; then
      EXCLUDE_ARG="$f"
    else
      EXCLUDE_ARG="$EXCLUDE_ARG,$f"
    fi
  done
  bash "$SCRIPT_DIR/dump.sh" --exclude "$EXCLUDE_ARG"
fi

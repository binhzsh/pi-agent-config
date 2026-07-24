#!/bin/bash
# Pi Spec-Driven Development — Initialize openspec directory structure
# Usage: ./scripts/init.sh [project-root]

set -euo pipefail

PROJECT_ROOT="${1:-.}"
OPENSPEC_DIR="$PROJECT_ROOT/openspec"

# Create directory structure
mkdir -p "$OPENSPEC_DIR/changes/archive"
mkdir -p "$OPENSPEC_DIR/specs"

# Create config if it doesn't exist
if [ ! -f "$OPENSPEC_DIR/config.yaml" ]; then
  cat > "$OPENSPEC_DIR/config.yaml" << 'EOF'
schema: spec-driven
context: |
  # Add your project context here:
  # Tech stack, conventions, constraints
  # This is injected into artifact generation

rules:
  specs:
    - Use WHEN/THEN format for scenarios
    - Every requirement MUST have at least one scenario
  tasks:
    - Keep tasks small enough for one session
  design:
    - Document decisions with rationale
EOF
  echo "Created $OPENSPEC_DIR/config.yaml"
else
  echo "Config already exists at $OPENSPEC_DIR/config.yaml"
fi

# Create .gitkeep files
touch "$OPENSPEC_DIR/changes/.gitkeep"
touch "$OPENSPEC_DIR/specs/.gitkeep"

echo "✓ OpenSpec directory structure created at $OPENSPEC_DIR/"
echo ""
echo "Next steps:"
echo "  /explore        — Think through ideas"
echo "  /propose <name> — Create a change"
echo "  /apply          — Implement tasks"
echo "  /archive        — Archive completed changes"

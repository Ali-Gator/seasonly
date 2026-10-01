#!/usr/bin/env bash
# PreToolUse hook for Edit/Write/Bash — blocks implementation edits without a spec.
# Receives tool input JSON on stdin. Exit 0 = allow, exit 2 = block.
#
# Edit/Write give the path outright. Bash does not: an agent working through the
# shell (`sed -i`, a `>` redirect, `tee`) used to walk straight past this gate,
# and since agents in this repo default to Bash that was most edits. So the
# command line is parsed for the paths it VISIBLY writes — see
# bash-write-targets.py for exactly which shapes that covers and which it cannot.
# Anything it cannot read is allowed through: a gate that guesses is a gate that
# gets switched off.

set -euo pipefail

INPUT=$(cat)
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

# A real JSON parser, not a substring grep: the grep below stops at the first
# escaped quote, which truncates any command carrying a quoted string — the same
# bug that once let `git commit` past the sibling gate.
json_field() {
  printf '%s' "$INPUT" |
    python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',d).get('$1','') or '')" \
      2>/dev/null || true
}

FILE_PATH=$(json_field file_path)
COMMAND=$(json_field command)

# No python3 (or an unparseable payload): fall back to the legacy extraction for
# Edit/Write, which is the case that must never silently stop being gated. Bash
# commands are given up on — they need the parser.
if [[ -z "$FILE_PATH" && -z "$COMMAND" ]]; then
  FILE_PATH=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)
fi

if [[ -n "$FILE_PATH" ]]; then
  TARGETS="$FILE_PATH"
  VIA_BASH=""
elif [[ -n "$COMMAND" ]]; then
  TARGETS=$(printf '%s' "$COMMAND" | python3 "$HOOK_DIR/bash-write-targets.py" 2>/dev/null || true)
  VIA_BASH="yes"
else
  exit 0
fi

# Nothing to check — leave before the README scan, this hook now runs on every
# Bash call and that scan spawns a subshell per row.
if [[ -z "$TARGETS" ]]; then
  exit 0
fi

SPEC_README="$PROJECT_ROOT/openspec/specs/README.md"

# If README doesn't exist yet, allow (bootstrapping)
if [[ ! -f "$SPEC_README" ]]; then
  exit 0
fi

# Prints the capability this path needs when that capability spec is missing; prints
# nothing when the path is exempt, unmapped, or already covered by an existing spec.
missing_spec_for() {
  local rel_path="$1"

  # --- Unconditionally allowed patterns ---
  # Workspace-aware: an exemption that names a file kind matches it in any package.
  local base="${rel_path##*/}"

  # Test files
  if [[ "$rel_path" == *"__tests__"* || "$rel_path" == *".test."* || "$rel_path" == *".spec."* ]]; then
    return 0
  fi

  # Docs, specs, markdown
  if [[ "$rel_path" == docs/* || "$rel_path" == *.md ]]; then
    return 0
  fi

  # Config files
  if [[ "$base" == *.config.* || "$base" == tsconfig*.json || "$base" == package.json ]]; then
    return 0
  fi

  # UI primitives
  if [[ "$rel_path" == apps/*/src/components/ui/* ]]; then
    return 0
  fi

  # Global styles
  if [[ "$rel_path" == apps/*/src/app/globals.css ]]; then
    return 0
  fi

  # Scripts and hooks
  if [[ "$rel_path" == scripts/* ]]; then
    return 0
  fi

  # Static assets
  if [[ "$rel_path" == apps/*/public/* ]]; then
    return 0
  fi

  # JSON, YAML, CSS files
  if [[ "$rel_path" == *.json || "$rel_path" == *.yaml || "$rel_path" == *.yml || "$rel_path" == *.css ]]; then
    return 0
  fi

  # .claude directory
  if [[ "$rel_path" == .claude/* ]]; then
    return 0
  fi

  # .env files, in any package
  if [[ "$base" == .env* ]]; then
    return 0
  fi

  # .gitignore
  if [[ "$base" == .gitignore ]]; then
    return 0
  fi

  # --- Check spec mapping ---

  # Find the capability whose globs cover this source path
  local spec globs glob escaped meta pattern spec_file=""
  while IFS='|' read -r _ spec globs _; do
    # Clean up whitespace
    spec=$(echo "$spec" | xargs | sed 's/`//g')
    globs=$(echo "$globs" | xargs | sed 's/`//g')

    # Skip header/separator rows
    [[ "$spec" == "Capability" || "$spec" == "---" || -z "$spec" ]] && continue

    # Check each glob pattern against the relative path
    IFS=',' read -ra GLOB_ARRAY <<< "$globs"
    for glob in "${GLOB_ARRAY[@]}"; do
      glob=$(echo "$glob" | xargs)

      # Convert glob to a regex-friendly pattern.
      #
      # Escape the regex metacharacters FIRST, then expand the wildcards. A
      # Next.js dynamic segment is otherwise read as a character class:
      # `app/seasons/[season]/**` would match `app/seasons/s/…` and never the real
      # directory. Route groups, `(marketing)`, are the same trap, so the whole
      # metacharacter set is escaped rather than just the brackets.
      #
      # Parameter expansion, not sed: `[.` inside a sed bracket expression opens
      # a collating symbol and BSD sed rejects the whole script, and this runs
      # per glob per row on every Bash call — the two subshells it drops are the
      # same cost the early exit above was added to avoid.
      escaped="$glob"
      for meta in '\' '.' '[' ']' '(' ')' '+' '?' '{' '}' '^' '$' '|'; do
        escaped=${escaped//"$meta"/\\"$meta"}
      done
      # Replace ** with a marker, * with [^/]*, then marker with .*
      pattern=${escaped//'**'/DOUBLESTAR}
      pattern=${pattern//'*'/'[^/]*'}
      pattern=${pattern//DOUBLESTAR/'.*'}
      if echo "$rel_path" | grep -qE "^${pattern}$"; then
        spec_file="$spec"
        break 2
      fi
    done
  done < "$SPEC_README"

  # If file is not mapped to any spec, allow (unmapped = not enforced).
  # This is the gate's widest hole: a brand-new implementation file has no README
  # row, so it is never blocked. Deliberate: enforcing "every unmapped path needs a
  # spec" would block scratch files and generated code, and a gate that cries wolf
  # gets switched off. Coverage is stated in CLAUDE.md.
  if [[ -z "$spec_file" ]]; then
    return 0
  fi

  if [[ ! -f "$PROJECT_ROOT/openspec/specs/$spec_file/spec.md" ]]; then
    printf '%s' "$spec_file"
  fi
  return 0
}

while IFS= read -r target; do
  [[ -z "$target" ]] && continue

  # Make path relative to project root; ./src/x.ts must match the glob src/x.ts
  rel="${target#"$PROJECT_ROOT"/}"
  rel="${rel#./}"

  spec=$(missing_spec_for "$rel")
  [[ -z "$spec" ]] && continue

  echo "BLOCKED: Spec required before editing '$rel'" >&2
  echo "Create spec: openspec/specs/$spec/spec.md (mapped in openspec/specs/README.md)" >&2
  echo "Workflow: Spec -> Tests -> Code" >&2
  if [[ -n "$VIA_BASH" ]]; then
    echo "(Path read out of the Bash command line. This gate sees > / >> redirects," >&2
    echo " tee, sed -i and heredoc headers — not paths built from shell variables," >&2
    echo " cp/mv, git apply, globs, or a script that writes files itself. Routing the" >&2
    echo " edit around it is not approval to skip the spec.)" >&2
  fi
  exit 2
done <<< "$TARGETS"

exit 0

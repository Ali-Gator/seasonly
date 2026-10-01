#!/usr/bin/env python3
"""Print the file paths a shell command *visibly* writes to, one per line.

Reads the command on stdin. Prints nothing when it cannot tell — silence means
"no opinion", never "no write". The caller (check-spec-exists.sh) turns each
printed path into the same spec check an Edit/Write gets, so a wrong guess here
blocks a legitimate command; not guessing is always the cheaper mistake.

Shapes it catches: `>` / `>>` redirects, `tee`, `sed -i`, and the target of a
heredoc header (`cat > src/x.ts <<'EOF'`).

Shapes it deliberately does NOT catch — see CLAUDE.md (Hooks):
  * a path built from a shell variable or command substitution
  * a script that writes files itself (`python3 - <<PY` ... `open(p, "w")`) —
    heredoc bodies are stripped on purpose, they are program text, not paths
  * `cp` / `mv` destinations, `git apply`, `patch`, `git checkout -- <path>`
  * glob targets (`sed -i 's/a/b/' src/**/*.ts`)
  * a command that `cd`s first — the path is then relative to another root

This is a gate against forgetting the spec-first rule, not a barrier against
evading it. It has holes and they are listed rather than implied.
"""

import re
import shlex
import sys

# `<<EOF`, `<<-EOF`, `<<'EOF'` — but never `<<<` (a here-string has no body).
HEREDOC = re.compile(r"<<(?!<)-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")

# A redirection that writes a file: `>`, `>>`, `&>`. Not `>&` (fd duplication,
# as in `2>&1`, whose "target" is a file descriptor number).
REDIRECT = re.compile(r"^&?>>?$")

# Shell operators that end one simple command and start the next.
SEPARATORS = {"|", "||", "&&", ";", "&", "(", ")", ";;", "|&"}

# A token we refuse to treat as a path: empty, a flag, a shell operator, a
# device, or anything still holding an unexpanded variable or glob.
UNUSABLE = re.compile(r"[$`*?\n]|^-|^$|[<>|;&()]")


def strip_heredoc_bodies(command: str) -> str:
    """Drop heredoc bodies, keep their header lines.

    A body is program text or file content, not a command line: tokenizing it
    invents targets out of `if (a > b)` and breaks shlex on a stray apostrophe.
    The header survives because that is where `cat > file <<EOF` puts its path.
    """
    lines = command.split("\n")
    kept: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        kept.append(line)
        i += 1
        for _, delimiter in HEREDOC.findall(line):
            while i < len(lines) and lines[i].strip() != delimiter:
                i += 1
            i += 1  # the terminator line itself
    return "\n".join(kept)


def tokenize(command: str) -> list[str]:
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    return list(lexer)


def is_path(token: str) -> bool:
    return not UNUSABLE.search(token) and not token.startswith("/dev/")


def split_segments(tokens: list[str]) -> list[list[str]]:
    segments: list[list[str]] = [[]]
    for token in tokens:
        if token and (token in SEPARATORS or set(token) <= set("|&;()")):
            segments.append([])
        else:
            segments[-1].append(token)
    return segments


def redirect_targets(tokens: list[str]) -> list[str]:
    return [
        tokens[i + 1]
        for i, token in enumerate(tokens[:-1])
        if REDIRECT.match(token) and is_path(tokens[i + 1])
    ]


def operand_targets(tokens: list[str], drop_script: bool) -> list[str]:
    """Usable non-flag operands of a command, minus the flags' own values."""
    operands: list[str] = []
    takes_value = False
    script_is_a_flag_value = False
    for token in tokens[1:]:
        if takes_value:
            takes_value = False
            continue
        if token.startswith("-") and token != "-":
            takes_value = token in ("-e", "-f", "--expression", "--file")
            script_is_a_flag_value = script_is_a_flag_value or takes_value
            continue
        if is_path(token):
            operands.append(token)
    if drop_script and not script_is_a_flag_value and operands:
        operands = operands[1:]  # sed's script expression, e.g. s/a/b/
    return operands


def strip_redirections(tokens: list[str]) -> list[str]:
    """Cut a segment off at its first redirection.

    Everything after one belongs to the redirect, not to the command's own
    operands — without this, `tee /tmp/x < in.txt` reports in.txt as written
    and `tee out.log 2>&1` reports the file descriptors as paths.
    """
    kept: list[str] = []
    for token in tokens:
        if "<" in token or ">" in token:
            break
        kept.append(token)
    while kept and kept[-1].isdigit():
        kept.pop()  # the leading fd of `2>&1`, left behind by the cut
    return kept


def command_targets(tokens: list[str]) -> list[str]:
    if not tokens:
        return []
    tokens = strip_redirections(tokens)
    if not tokens:
        return []
    name = tokens[0].rsplit("/", 1)[-1]
    if name == "tee":
        return operand_targets(tokens, drop_script=False)
    if name == "sed" and any(
        token == "--in-place" or re.match(r"^-[a-zA-Z]*i", token) for token in tokens[1:]
    ):
        # `sed -i 's/a/b/' f` and BSD `sed -i '' 's/a/b/' f` (the empty token is
        # dropped as unusable). With -e/-f the expression is a flag value, so
        # the leading operand is already a file — but dropping one file when
        # several are listed only ever under-reports, which is the safe way out.
        return operand_targets(tokens, drop_script=True)
    return []


def main() -> None:
    command = sys.stdin.read()
    try:
        tokens = tokenize(strip_heredoc_bodies(command))
    except ValueError:
        return  # unbalanced quotes: no opinion

    seen: dict[str, None] = {}
    for segment in split_segments(tokens):
        for target in redirect_targets(segment) + command_targets(segment):
            seen.setdefault(target, None)
    for target in seen:
        print(target)


if __name__ == "__main__":
    main()

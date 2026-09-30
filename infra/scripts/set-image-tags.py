#!/usr/bin/env python3
"""Point the production overlay at immutable images from one publish."""

import sys
from pathlib import Path

IMAGES = ("internity-backend", "internity-web", "internity-staff")


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if len(sys.argv) != 4:
        fail("usage: set-image-tags.py DOCKERHUB_USERNAME sha-<commit> kustomization.yaml")
    registry_user, tag, path = sys.argv[1:]
    if not registry_user or any(char in registry_user for char in "/ \t"):
        fail("DOCKERHUB_USERNAME must be a single Docker Hub user")
    if not tag.startswith("sha-") or len(tag) < len("sha-") + 7:
        fail("image tag must look like sha-<commit>")

    file = Path(path)
    text = file.read_text(encoding="utf-8")
    names = {
        image: f"docker.io/{registry_user}/{image}"
        for image in IMAGES
    }
    current = None
    renamed: set[str] = set()
    retagged: set[str] = set()
    out: list[str] = []
    for line in text.splitlines(keepends=True):
        ending = "\r\n" if line.endswith("\r\n") else "\n"
        body = line[: -len(ending)] if line.endswith(("\n", "\r")) else line
        stripped = body.strip()
        if stripped.startswith("- name:"):
            name = stripped.split(":", 1)[1].strip()
            current = name if name in names else None
            out.append(line)
            continue
        if current and stripped.startswith("newName:"):
            indent = body[: len(body) - len(body.lstrip())]
            out.append(f"{indent}newName: {names[current]}{ending}")
            renamed.add(current)
            continue
        if current and stripped.startswith("newTag:"):
            indent = body[: len(body) - len(body.lstrip())]
            out.append(f"{indent}newTag: {tag}{ending}")
            retagged.add(current)
            continue
        out.append(line)

    missing = [image for image in IMAGES if image not in renamed or image not in retagged]
    if missing:
        fail("production overlay is missing newName or newTag for " + ", ".join(missing))
    file.write_text("".join(out), encoding="utf-8", newline="")


if __name__ == "__main__":
    main()

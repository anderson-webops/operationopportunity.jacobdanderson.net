#!/usr/bin/env python3
"""Build/verify a strictly inventoried production tree; never archive runtime state."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import tarfile
import sys
sys.dont_write_bytecode = True

CONTRACT = Path(__file__).resolve().parent.parent / "deploy/runtime-artifact.json"
MANIFEST = "runtime-manifest.json"


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def permitted(name):
    parts = PurePosixPath(name).parts
    return bool(parts) and PurePosixPath(name).as_posix() == name and not name.startswith("/") and parts[0] in (
        "back-end", "front-end", "package.json", "package-lock.json", MANIFEST
    ) and all(
        part not in (".", "..", ".git", ".ai-work", ".npmrc")
        and not part.startswith(".env")
        and not part.endswith((".pem", ".key", ".sqlite3", ".sqlite3-wal", ".sqlite3-shm"))
        and part not in ("credentials.json", "uploads", "spool", ".data", "dist-test", ".cache")
        for part in parts
    )


def inventory(root):
    files = {}
    for path in sorted(root.rglob("*")):
        name = path.relative_to(root).as_posix()
        if path.is_symlink() or not permitted(name):
            raise ValueError(f"forbidden artifact path: {name}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f"not a regular file: {name}")
        if name != MANIFEST:
            files[name] = {"sha256": digest(path), "size": path.stat().st_size}
    return files


def validate(root, manifest):
    contract = json.loads(CONTRACT.read_text())
    if manifest.get("format") != 1 or manifest.get("contract") != contract:
        raise ValueError("artifact does not match the independently trusted runtime contract")
    if not re.fullmatch(r"[0-9a-f]{40}", manifest.get("commit", "")):
        raise ValueError("an exact source commit is required")
    actual = inventory(root)
    if actual != manifest.get("files"):
        raise ValueError("artifact paths, hashes or sizes do not match")
    for name in contract["required"]:
        if name not in actual:
            raise ValueError(f"required runtime path missing: {name}")
    if (root / "back-end/src").exists() or (root / "front-end/src").exists():
        raise ValueError("application source must not ship")
    for folder in ("back-end", "front-end"):
        for path in (root / folder).iterdir():
            if path.name not in (("dist", "node_modules", "package.json", "package-lock.json") if folder == "back-end" else ("dist", "package.json")):
                raise ValueError("unexpected component path")
    package = json.loads((root / "back-end/package.json").read_text())
    lock = json.loads((root / "back-end/package-lock.json").read_text())
    if package["version"] != lock["version"] or package["dependencies"] != lock["packages"][""]["dependencies"]:
        raise ValueError("manifest and lock disagree")
    for name, spec in lock["packages"].items():
        if not name:
            continue
        exists = (root / "back-end" / name / "package.json").is_file()
        if spec.get("dev") and exists:
            raise ValueError(f"development dependency in runtime: {name}")
        if not spec.get("dev") and not spec.get("optional") and not exists:
            raise ValueError(f"production dependency missing: {name}")
        if exists and json.loads((root / "back-end" / name / "package.json").read_text())["version"] != spec["version"]:
            raise ValueError(f"dependency version differs from lock: {name}")
    for name in actual:
        if name.endswith(".node") or name.endswith(".so"):
            if not any(name.startswith(prefix) for prefix in contract["allowedNativeTrees"]):
                raise ValueError(f"undeclared native binding: {name}")
    release = json.loads((root / "front-end/dist/release.json").read_text())
    if release.get("commit") != manifest["commit"] or release.get("release") != "v" + package["version"]:
        raise ValueError("static release identity does not match artifact")
    for folder in ("", "front-end"):
        if json.loads((root / folder / "package.json").read_text())["version"] != package["version"]:
            raise ValueError("workspace release versions differ")
    if not any(name.startswith("front-end/dist/assets/") and name.endswith(".js") for name in actual):
        raise ValueError("static JavaScript assets missing")
    for name in re.findall(r'(?:src|href)=["\'](/assets/[^"\']+)', (root / "front-end/dist/index.html").read_text()):
        if "front-end/dist" + name not in actual:
            raise ValueError("referenced static asset missing")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["pack", "verify", "unpack"])
    parser.add_argument("tree", type=Path)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--commit")
    parser.add_argument("--sha256")
    args = parser.parse_args()
    root = args.tree.resolve(strict=True)
    if args.operation == "unpack":
        if not args.archive or not args.sha256 or not args.commit:
            parser.error("unpack requires --archive, --sha256 and --commit from the trusted release record")
        if digest(args.archive) != args.sha256 or any(root.iterdir()):
            raise ValueError("archive hash mismatch or destination not empty")
        with tarfile.open(args.archive, "r:gz") as archive:
            members = archive.getmembers()
            names = [member.name for member in members]
            if (len(names) != len(set(names)) or len(names) > 100_000
                    or sum(member.size for member in members) > 512 * 1024 * 1024
                    or any(not member.isfile() or not permitted(member.name) for member in members)):
                raise ValueError("unsafe archive members")
            for member in members:
                target = root / member.name
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, target.open("xb") as output:
                    while chunk := source.read(1024 * 1024):
                        output.write(chunk)
                target.chmod(member.mode & 0o755)
        manifest = validate(root, json.loads((root / MANIFEST).read_text()))
        if manifest["commit"] != args.commit:
            raise ValueError("artifact source identity mismatch")
        print(json.dumps({"unpacked": True, "commit": manifest["commit"], "files": len(manifest["files"])}))
    elif args.operation == "pack":
        if not args.archive or not args.commit:
            parser.error("pack requires --archive and --commit")
        if args.archive.exists():
            raise ValueError("Never overwrite an existing artifact")
        manifest = {"format": 1, "commit": args.commit,
                    "contract": json.loads(CONTRACT.read_text()), "files": inventory(root)}
        validate(root, manifest)
        (root / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n")
        with tarfile.open(args.archive, "w:gz") as archive:
            for name in sorted([MANIFEST, *manifest["files"]]):
                archive.add(root / name, arcname=name, recursive=False)
        print(json.dumps({"archive": args.archive.name, "sha256": digest(args.archive),
                          "commit": args.commit, "files": len(manifest["files"])}))
    else:
        declared = json.loads((root / MANIFEST).read_text())
        if args.archive or args.sha256:
            if not args.archive or not args.sha256 or digest(args.archive) != args.sha256:
                raise ValueError("trusted archive checksum mismatch")
            with tarfile.open(args.archive, "r:gz") as archive:
                trusted = json.load(archive.extractfile(MANIFEST))
            if declared != trusted:
                raise ValueError("staged manifest differs from trusted archive")
        manifest = validate(root, declared)
        if args.commit and manifest["commit"] != args.commit:
            raise ValueError("artifact source identity mismatch")
        print(json.dumps({"verified": True, "commit": manifest["commit"], "files": len(manifest["files"])}))


if __name__ == "__main__":
    main()

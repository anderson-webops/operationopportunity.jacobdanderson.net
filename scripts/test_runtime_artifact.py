import importlib.util
import json
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("artifact", Path(__file__).with_name("runtime-artifact.py"))
artifact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(artifact)


class RuntimeArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.contract = json.loads(artifact.CONTRACT.read_text())
        for name in self.contract["required"]:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("synthetic runtime module\n")
        (self.root / "back-end/package.json").write_text(json.dumps({"version": "1.0.0", "dependencies": {}}))
        (self.root / "back-end/package-lock.json").write_text(json.dumps({"version": "1.0.0", "packages": {"": {"dependencies": {}}}}))

        for name in ['package.json','front-end/package.json']:
            (self.root / name).write_text(json.dumps({'version':'1.0.0'}))
        (self.root/'front-end/dist/release.json').write_text(json.dumps({'release':'v1.0.0','commit':'a'*40}))
        (self.root/'front-end/dist/assets').mkdir()
        (self.root/'front-end/dist/assets/app.js').write_text('synthetic static')

    def manifest(self):
        return {"format": 1, "commit": "a" * 40, "contract": self.contract,
                "files": artifact.inventory(self.root)}

    def test_valid_tree(self):
        artifact.validate(self.root, self.manifest())

    def test_hash_tampering(self):
        manifest = self.manifest()
        (self.root / "back-end/dist/app.js").write_text("changed")
        with self.assertRaisesRegex(ValueError, "hashes"):
            artifact.validate(self.root, manifest)

    def test_missing_module_even_if_the_inventory_omits_it(self):
        (self.root / "back-end/dist/runtimeCapacity.js").unlink()
        with self.assertRaisesRegex(ValueError, "required runtime path missing"):
            artifact.validate(self.root, self.manifest())

    def test_symlinks_and_private_state(self):
        for name in [".env", "credentials.json", "back-end/dist/key.pem", "back-end/dist/enrollment.sqlite3", "back-end/dist/index.sqlite", "back-end/dist/index.sqlite-wal", "back-end/dist/index.sqlite-journal"]:
            with self.subTest(name=name):
                path = self.root / name
                path.write_text("synthetic forbidden content")
                with self.assertRaisesRegex(ValueError, "forbidden"):
                    self.manifest()
                path.unlink()
        (self.root / "back-end/dist/escape").symlink_to("/tmp")
        with self.assertRaisesRegex(ValueError, "forbidden"):
            self.manifest()

    def test_missing_production_dependency(self):
        package = {"version": "1.0.0", "dependencies": {"fixture": "1.0.0"}}
        (self.root / "back-end/package.json").write_text(json.dumps(package))
        (self.root / "back-end/package-lock.json").write_text(json.dumps({
            "version": "1.0.0", "packages": {"": package, "node_modules/fixture": {"version": "1.0.0"}}}))
        with self.assertRaisesRegex(ValueError, "production dependency missing"):
            artifact.validate(self.root, self.manifest())

    def test_exact_archive_roundtrip_and_post_copier_verification(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            archive = output / "runtime.tar.gz"
            unpacked = output / "unpacked"
            unpacked.mkdir()
            command = [sys.executable, "-B", str(Path(artifact.__file__))]
            subprocess.run([*command, "pack", str(self.root), "--archive", str(archive), "--commit", "a" * 40], check=True, capture_output=True)
            sha = artifact.digest(archive)
            arguments = ["--archive", str(archive), "--sha256", sha, "--commit", "a" * 40]
            subprocess.run([*command, "unpack", str(unpacked), *arguments], check=True, capture_output=True)
            subprocess.run([*command, "verify", str(unpacked), *arguments], check=True, capture_output=True)
            (unpacked / "back-end/dist/runtimeCapacity.js").unlink()
            # Rehashing the copier's incomplete tree cannot override the trusted archive.
            manifest = json.loads((unpacked / artifact.MANIFEST).read_text())
            manifest["files"].pop("back-end/dist/runtimeCapacity.js")
            (unpacked / artifact.MANIFEST).write_text(json.dumps(manifest))
            result = subprocess.run([*command, "verify", str(unpacked), *arguments], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("differs from trusted archive", result.stderr)


if __name__ == "__main__":
    unittest.main()

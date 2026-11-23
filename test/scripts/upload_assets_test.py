import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile


spec = importlib.util.spec_from_file_location(
    "upload_assets", Path(__file__).resolve().parents[2] / "scripts" / "upload-assets.py"
)
upload_assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload_assets)


class UploadAssetsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.archive_path = Path(self.temp.name) / "package.zip"
        self.calls = []

    def archive(self, files):
        with zipfile.ZipFile(self.archive_path, "w") as archive:
            for name, value in files.items():
                archive.writestr(name, value)

    def aws(self, *args, capture=False):
        self.calls.append(args)
        if args[0] == "list-objects-v2":
            return json.dumps({"Contents": [
                {"Key": "public-portal/public-web-assets/feat-node24-upgrade/public/old.js"},
                {"Key": "public-portal/public-web-assets/feat-node24-upgrade/public/all.css"},
            ]})
        if args[0] == "put-object":
            self.assertEqual(Path(args[args.index("--body") + 1]).read_bytes(), b"stylesheet")
        return ""

    def test_branch_upload_removes_only_stale_assets(self):
        self.archive({"public/all.css": b"stylesheet", "app.js": b"handler"})
        with patch.object(upload_assets, "aws", self.aws):
            upload_assets.upload_assets(self.archive_path, "bucket", "feat-node24-upgrade", False)
        self.assertIn("public-portal/public-web-assets/feat-node24-upgrade/public/", self.calls[0])
        put = self.calls[1]
        self.assertIn("public-portal/public-web-assets/feat-node24-upgrade/public/all.css", put)
        self.assertIn("lifecycle_subject=true", put)
        self.assertIn("text/css", put)
        self.assertEqual(self.calls[2], (
            "delete-object", "--bucket", "bucket", "--key",
            "public-portal/public-web-assets/feat-node24-upgrade/public/old.js",
        ))

    def test_release_upload_never_lists_or_deletes_branch_objects(self):
        self.archive({"public/all.css": b"stylesheet"})
        with patch.object(upload_assets, "aws", self.aws):
            upload_assets.upload_assets(self.archive_path, "bucket", "v4.1.0", True)
        self.assertEqual(len(self.calls), 1)
        self.assertIn("public-portal/public-web-assets/release-v4.1.0/public/all.css", self.calls[0])
        self.assertIn("promote=YES", self.calls[0])

    def test_empty_or_invalid_archive_does_not_remove_objects(self):
        for files in ({"app.js": b"handler"}, {"public/../other": b"invalid"}):
            self.archive(files)
            with patch.object(upload_assets, "aws", self.aws), self.assertRaises(ValueError):
                upload_assets.upload_assets(self.archive_path, "bucket", "feat-node24-upgrade", False)
            self.assertEqual(self.calls, [])

    def test_failed_upload_does_not_remove_old_objects(self):
        self.archive({"public/all.css": b"stylesheet"})

        def fail_put(*args, capture=False):
            if args[0] == "put-object":
                raise RuntimeError("upload failed")
            return self.aws(*args, capture=capture)

        with patch.object(upload_assets, "aws", fail_put), self.assertRaises(RuntimeError):
            upload_assets.upload_assets(self.archive_path, "bucket", "feat-node24-upgrade", False)
        self.assertTrue(all(call[0] != "delete-object" for call in self.calls))


if __name__ == "__main__":
    unittest.main()

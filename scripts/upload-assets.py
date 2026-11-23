import argparse
import json
import mimetypes
from pathlib import Path, PurePosixPath
import subprocess
import tempfile
import zipfile


def aws(*args, capture=False):
    result = subprocess.run(
        ["aws", "s3api", *args, "--no-cli-pager"],
        check=True,
        stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
        text=True,
    )
    return result.stdout


def upload_assets(archive_path, bucket, name, release):
    if not name or "/" in name or name in (".", ".."):
        raise ValueError("Invalid asset version or branch name")
    if not release and not name.startswith(("feat-", "feature-", "fix-", "master")):
        raise ValueError("Invalid CI branch prefix")

    prefix = f"public-portal/public-web-assets/{'release-' if release else ''}{name}/public/"
    tagging = "promote=YES" if release else (
        "lifecycle_subject=true" if name.startswith(("feat-", "feature-", "fix-"))
        else "lifecycle_subject=false"
    )
    with zipfile.ZipFile(archive_path) as archive, tempfile.TemporaryDirectory() as directory:
        files = [item for item in archive.infolist() if item.filename.startswith("public/") and not item.is_dir()]
        if not files:
            raise ValueError("Archive contains no public assets")
        keys = set()
        for item in files:
            path = PurePosixPath(item.filename)
            if ".." in path.parts or path.is_absolute() or str(path) != item.filename:
                raise ValueError(f"Invalid asset path: {item.filename}")
            key = prefix + str(path.relative_to("public"))
            if key in keys:
                raise ValueError(f"Duplicate asset path: {item.filename}")
            keys.add(key)

        version_key = prefix + "version.md"
        if version_key in keys:
            raise ValueError("Archive contains reserved public/version.md")
        keys.add(version_key)

        old_keys = set()
        if not release:
            response = json.loads(aws("list-objects-v2", "--bucket", bucket, "--prefix", prefix,
                                      "--output", "json", capture=True))
            old_keys = {item["Key"] for item in response.get("Contents", [])}
            if any(not key.startswith(prefix) for key in old_keys):
                raise ValueError("Unexpected object outside branch asset prefix")

        for item in files:
            path = PurePosixPath(item.filename)
            target = Path(directory) / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(item))
            content_type = mimetypes.guess_type(item.filename)[0] or "application/octet-stream"
            aws("put-object", "--bucket", bucket, "--key", prefix + str(path.relative_to("public")),
                "--body", str(target), "--content-type", content_type, "--tagging", tagging)

        for key in sorted(old_keys - keys):
            aws("delete-object", "--bucket", bucket, "--key", key)

        version_file = Path(directory) / "version.md"
        version_file.write_text(f"{'release-' if release else ''}{name}{'.zip' if release else ''}\n",
                                encoding="utf-8")
        aws("put-object", "--bucket", bucket, "--key", version_key,
            "--body", str(version_file), "--content-type", "text/markdown", "--tagging", tagging)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("bucket")
    parser.add_argument("name")
    parser.add_argument("--release", action="store_true")
    args = parser.parse_args()
    upload_assets(args.archive, args.bucket, args.name, args.release)

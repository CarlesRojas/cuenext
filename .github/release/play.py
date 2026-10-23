#!/usr/bin/env python3
"""
Google Play step of the Release workflow (.github/workflows/release.yml).

  play.py upload --package app.cuenext.pinya --aab app.aab --version-code 15
      Uploads the bundle and creates a DRAFT production release named "v15", with NOTES as its
      release notes in the store listing's default language. Nothing is sent for review: that
      stays a manual click in Play Console.

The service account JSON is read from the PLAY_SERVICE_ACCOUNT_JSON environment variable. The
account needs access to the app in Play Console (Users and permissions, "Release to
production" for this app).

Requires: pip install google-auth requests
"""

import argparse
import json
import os
import sys

SCOPE = "https://www.googleapis.com/auth/androidpublisher"
API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications"

# The same line every release: these apps update from the website, so a store release only
# carries Android wrapper changes.
NOTES = "Bug fixes and performance improvements"


def session():
    from google.auth.transport.requests import AuthorizedSession
    from google.oauth2 import service_account

    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

    info = json.loads(os.environ["PLAY_SERVICE_ACCOUNT_JSON"])
    creds = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    s = AuthorizedSession(creds)
    # Play answers 503/500/429 now and then; a long upload must not die on one of them.
    # Waits 2, 4, 8... up to about 2 minutes in total before giving up.
    retry = Retry(total=6, backoff_factor=2, status_forcelist=(429, 500, 502, 503, 504),
                  allowed_methods=None, raise_on_status=False)
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s


def check(response):
    if not response.ok:
        sys.exit(f"Play API error {response.status_code}: {response.text}")
    return response.json() if response.content else {}


def cmd_upload(args):
    base = f"{API}/{args.package}"
    s = session()
    edit_id = check(s.post(f"{base}/edits"))["id"]
    try:
        with open(args.aab, "rb") as bundle:
            # Bytes, not the file object, so a retried request sends the whole bundle again.
            bundle = bundle.read()
            uploaded = check(s.post(
                f"{UPLOAD}/{args.package}/edits/{edit_id}/bundles",
                params={"uploadType": "media"},
                headers={"Content-Type": "application/octet-stream"},
                data=bundle,
                timeout=600,
            ))
        if uploaded["versionCode"] != args.version_code:
            sys.exit(f"Bundle has versionCode {uploaded['versionCode']}, expected {args.version_code}")

        language = check(s.get(f"{base}/edits/{edit_id}/details"))["defaultLanguage"]

        check(s.put(f"{base}/edits/{edit_id}/tracks/production", json={
            "track": "production",
            "releases": [{
                "name": f"v{args.version_code}",
                "versionCodes": [str(args.version_code)],
                "status": "draft",
                "releaseNotes": [{"language": language, "text": NOTES}],
            }],
        }))
        check(s.post(f"{base}/edits/{edit_id}:commit"))
    except BaseException:
        s.delete(f"{base}/edits/{edit_id}")
        raise
    print(f"Draft production release v{args.version_code} created for {args.package}")


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(required=True)

    upload = commands.add_parser("upload")
    upload.add_argument("--package", required=True)
    upload.add_argument("--aab", required=True)
    upload.add_argument("--version-code", type=int, required=True)
    upload.set_defaults(run=cmd_upload)

    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()

#!/bin/sh
#
# Copy the home-screen widget into the Bubblewrap project and patch the manifest.
# Run after `bubblewrap update`, before `bubblewrap build`. apply-assets.sh runs it.
#
# `bubblewrap update` deletes app/ and regenerates it from its templates, which know
# nothing about the widget. Everything the widget needs therefore lives in widget/ (Java
# sources, resources, and the manifest snippets) and gets copied back into app/ here on
# every release. The widget is plain-framework Java with no extra dependencies on
# purpose, so build.gradle never needs patching - only AndroidManifest.xml does.

set -eu

cd "$(dirname "$0")"

MANIFEST="app/src/main/AndroidManifest.xml"

[ -d app/src/main ] || { echo "missing app/src/main - run bubblewrap update first" >&2; exit 1; }
[ -f "$MANIFEST" ] || { echo "missing $MANIFEST" >&2; exit 1; }

# Java sources: widget/src mirrors the app/src/main/java package tree.
mkdir -p app/src/main/java
cp -R widget/src/. app/src/main/java/

# Resources: merged folder by folder; every file is widget-prefixed (widget_*, ic_widget_*,
# watchlist_widget_info) so nothing Bubblewrap generates can collide.
for dir in widget/res/*; do
    name="$(basename "$dir")"
    mkdir -p "app/src/main/res/$name"
    cp "$dir"/* "app/src/main/res/$name/"
done

# Manifest: insert the INTERNET permission before <application> and the widget components
# before </application>. Skipped when a previous run already inserted them.
if ! grep -q "WatchlistWidgetProvider" "$MANIFEST"; then
    awk 'NR==FNR { lines[++n]=$0; next }
         !done && /<application/ { for (i = 1; i <= n; i++) print lines[i]; done = 1 }
         { print }' widget/manifest/permissions.xml "$MANIFEST" > "$MANIFEST.tmp"
    mv "$MANIFEST.tmp" "$MANIFEST"

    awk 'NR==FNR { lines[++n]=$0; next }
         !done && /<\/application>/ { for (i = 1; i <= n; i++) print lines[i]; done = 1 }
         { print }' widget/manifest/application.xml "$MANIFEST" > "$MANIFEST.tmp"
    mv "$MANIFEST.tmp" "$MANIFEST"
fi

grep -q "WatchlistWidgetProvider" "$MANIFEST" || { echo "widget components did not land in $MANIFEST" >&2; exit 1; }
grep -q "android.permission.INTERNET" "$MANIFEST" || { echo "INTERNET permission did not land in $MANIFEST" >&2; exit 1; }

echo "Widget sources, resources and manifest entries applied."

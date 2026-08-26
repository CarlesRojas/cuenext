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
# before </application>. Both snippets are wrapped in cuenext-widget marker comments, and
# anything between markers from a previous run is stripped first, so re-running (or
# changing the snippets) always converges on the current widget/manifest/ contents.
strip_markers() {
    awk -v tag="$1" '
        $0 ~ "cuenext-widget:" tag ":begin" { skipping = 1; next }
        $0 ~ "cuenext-widget:" tag ":end" { skipping = 0; next }
        !skipping { print }' "$MANIFEST" > "$MANIFEST.tmp"
    mv "$MANIFEST.tmp" "$MANIFEST"
}

insert_before() {
    awk -v marker="$1" '
        NR==FNR { lines[++n] = $0; next }
        !done && $0 ~ marker { for (i = 1; i <= n; i++) print lines[i]; done = 1 }
        { print }' "$2" "$MANIFEST" > "$MANIFEST.tmp"
    mv "$MANIFEST.tmp" "$MANIFEST"
}

strip_markers permissions
strip_markers components
insert_before "<application" widget/manifest/permissions.xml
insert_before "</application>" widget/manifest/application.xml

grep -q "WatchlistWidgetProvider" "$MANIFEST" || { echo "widget components did not land in $MANIFEST" >&2; exit 1; }
grep -q "android.permission.INTERNET" "$MANIFEST" || { echo "INTERNET permission did not land in $MANIFEST" >&2; exit 1; }

echo "Widget sources, resources and manifest entries applied."

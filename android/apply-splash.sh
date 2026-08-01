#!/bin/sh
#
# Copy the custom splash screens over the ones Bubblewrap generates.
# Run after `bubblewrap update`, before `bubblewrap build`.
#
# The masters in splash/ were rendered from public/logo256.png with the mark at
# 30.7% of the canvas width. Bubblewrap's own splash fills the canvas with the
# whole icon, which puts the mark at 47.25% and reads as oversized on launch.

set -eu

cd "$(dirname "$0")"

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    source_file="splash/drawable-$density/splash.png"
    target_file="app/src/main/res/drawable-$density/splash.png"

    [ -f "$source_file" ] || { echo "missing $source_file" >&2; exit 1; }
    [ -d "$(dirname "$target_file")" ] || { echo "missing $(dirname "$target_file")" >&2; exit 1; }

    cp "$source_file" "$target_file"
done

echo "Splash screens restored from splash/."

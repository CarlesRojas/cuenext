#!/bin/sh
#
# Copy our splash screens and adaptive icon layers over the ones Bubblewrap generates.
# Run after `bubblewrap update`, before `bubblewrap build`.
#
# Both are written by `pnpm android:assets`, which explains what it changes and why. The splash is
# redrawn because Bubblewrap resizes the whole icon to fill the canvas, leaving the mark at 47.25%
# of it rather than the 30.67% here. The icon layers are redrawn because Bubblewrap downloads them
# from the live site at update time, so the padding around the mark would otherwise be whatever
# www.cuenext.app happens to be serving that day.
#
# `bubblewrap update` deletes app/ and regenerates it, which is why these masters live outside it
# and why this runs every release rather than once.

set -eu

cd "$(dirname "$0")"

restore() {
    source_file="$1"
    target_file="$2"

    [ -f "$source_file" ] || { echo "missing $source_file" >&2; exit 1; }
    [ -d "$(dirname "$target_file")" ] || { echo "missing $(dirname "$target_file")" >&2; exit 1; }

    cp "$source_file" "$target_file"
}

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    restore "splash/drawable-$density/splash.png" "app/src/main/res/drawable-$density/splash.png"
    restore "icon/mipmap-$density/ic_maskable.png" "app/src/main/res/mipmap-$density/ic_maskable.png"
done

echo "Splash screens and adaptive icon layers restored."

# The home-screen widget lives in widget/ for the same reason the masters above live
# outside app/: `bubblewrap update` deletes app/ wholesale.
./apply-widget.sh

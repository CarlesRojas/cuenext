package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import app.cuenext.pinya.R;

/**
 * Builds the grid's cell RemoteViews for one widget from the cached payload - the whole
 * list at once, poster bitmaps included, so whoever attaches them (the
 * RemoteCollectionItems path on Android 12+, the legacy factory below it) hands the
 * launcher everything up front and scrolling never loads anything. Skeleton cells stand
 * in while the widget's media type has no cached payload yet.
 */
final class WidgetCells {
    private static final int SKELETON_CELLS = 6;

    private WidgetCells() {}

    /** True when the returned cells are skeletons (no payload yet). */
    static boolean isSkeleton(Context context, int widgetId) {
        String media = WidgetPrefs.getMedia(context, widgetId);
        return WidgetPrefs.getCachedSections(context, media) == null;
    }

    static List<RemoteViews> build(Context context, AppWidgetManager manager, int widgetId) {
        long start = System.currentTimeMillis();

        int cellHeightDp = WidgetRenderer.cellHeightDp(manager, widgetId);
        List<RemoteViews> cells = new ArrayList<>();

        String media = WidgetPrefs.getMedia(context, widgetId);
        String json = WidgetPrefs.getCachedSections(context, media);

        if (json == null) {
            // No payload yet (first placement, or the toggle moved to a media that was
            // never fetched): pulse skeletons until the provider's fetch lands.
            for (int i = 0; i < SKELETON_CELLS; i++) cells.add(skeletonCell(context, cellHeightDp));
        } else {
            try {
                JSONArray sections = new JSONObject(json).getJSONArray("sections");

                String sectionKey = WidgetPrefs.getSection(context, widgetId);
                JSONObject section = sections.getJSONObject(0);
                for (int i = 0; i < sections.length(); i++) {
                    if (sections.getJSONObject(i).getString("key").equals(sectionKey)) {
                        section = sections.getJSONObject(i);
                        break;
                    }
                }

                JSONArray items = section.getJSONArray("items");
                for (int i = 0; i < items.length(); i++)
                    cells.add(buildCell(context, items.getJSONObject(i), cellHeightDp));
            } catch (Exception ignored) {
            }
        }

        Log.d(WidgetLog.TAG, "buildCells widget=" + widgetId + " media=" + media
                + " payload=" + (json != null) + " cells=" + cells.size()
                + " took=" + (System.currentTimeMillis() - start) + "ms");

        return cells;
    }

    private static RemoteViews buildCell(Context context, JSONObject item, int cellHeightDp) throws Exception {
        RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_item);

        pinHeight(cell, R.id.item_poster, cellHeightDp);

        Bitmap poster = WidgetApi.posterBitmap(context, item.optString("posterUrl", null));

        if (poster != null) {
            cell.setImageViewBitmap(R.id.item_poster, poster);
            cell.setViewVisibility(R.id.item_fallback, View.GONE);
        } else {
            // Same fallback the app's PosterCard has: the title on the card background.
            // The placeholder card keeps the cell's 2:3 shape.
            cell.setImageViewBitmap(R.id.item_poster, WidgetApi.placeholderBitmap(context));
            cell.setViewVisibility(R.id.item_fallback, View.VISIBLE);
            cell.setTextViewText(R.id.item_fallback, item.getString("name"));
        }

        if (item.has("progress")) {
            cell.setViewVisibility(R.id.item_progress, View.VISIBLE);
            cell.setProgressBar(R.id.item_progress, 100, item.getInt("progress"), false);
        } else {
            cell.setViewVisibility(R.id.item_progress, View.GONE);
        }

        cell.setOnClickFillInIntent(R.id.item_root,
                new Intent().putExtra(WatchlistWidgetProvider.EXTRA_URL, item.getString("appUrl")));

        return cell;
    }

    // A card-shaped gray cell that pulses (a ViewFlipper fading a soft highlight in and
    // out - RemoteViews can't run property animations, but flippers auto-start).
    static RemoteViews skeletonCell(Context context, int cellHeightDp) {
        RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_item_skeleton);
        pinHeight(cell, R.id.skeleton_poster, cellHeightDp);
        cell.setImageViewBitmap(R.id.skeleton_poster, WidgetApi.placeholderBitmap(context));
        return cell;
    }

    // Fixed cell heights keep the grid's measurement independent of the images (see
    // WidgetRenderer.cellHeightDp). Pre-Android 12 keeps the adjustViewBounds fallback,
    // since setViewLayoutHeight doesn't exist there.
    private static void pinHeight(RemoteViews cell, int viewId, int cellHeightDp) {
        if (android.os.Build.VERSION.SDK_INT >= 31 && cellHeightDp > 0)
            cell.setViewLayoutHeight(viewId, cellHeightDp, android.util.TypedValue.COMPLEX_UNIT_DIP);
    }
}

package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import app.cuenext.pinya.R;

/**
 * Backs the widget's scrolling grid. Every cell is built up front in onDataSetChanged
 * (a dozen items at most), so getViewAt is a plain list lookup and scrolling never
 * decodes bitmaps, hits the disk, or shows the launcher's loading view. The factory
 * never touches the network - the provider owns fetching - and renders pulsing skeleton
 * cards while its media type has no cached payload yet.
 */
public class WidgetGridService extends RemoteViewsService {
    private static final int SKELETON_CELLS = 6;

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);

        // Launchers may drop extras when caching the adapter connection; the id is also
        // in the data URI (see WidgetRenderer).
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID && intent.getData() != null) {
            try {
                widgetId = Integer.parseInt(intent.getData().getLastPathSegment());
            } catch (Exception ignored) {
            }
        }

        return new GridFactory(getApplicationContext(), widgetId);
    }

    static class GridFactory implements RemoteViewsFactory {
        private final Context context;
        private final int widgetId;
        private final List<RemoteViews> cells = new ArrayList<>();
        private int cellHeightDp;

        GridFactory(Context context, int widgetId) {
            this.context = context;
            this.widgetId = widgetId;
            Log.d(WidgetLog.TAG, "factory created for widget " + widgetId);
        }

        @Override
        public void onDataSetChanged() {
            long start = System.currentTimeMillis();

            cellHeightDp = WidgetRenderer.cellHeightDp(AppWidgetManager.getInstance(context), widgetId);

            List<RemoteViews> built = new ArrayList<>();

            String media = WidgetPrefs.getMedia(context, widgetId);
            String json = WidgetPrefs.getCachedSections(context, media);

            if (json == null) {
                // No payload yet (first placement, or the toggle moved to a media that
                // was never fetched): pulse skeletons until the provider's fetch lands.
                for (int i = 0; i < SKELETON_CELLS; i++) built.add(skeletonCell());
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
                    for (int i = 0; i < items.length(); i++) built.add(buildCell(items.getJSONObject(i)));
                } catch (Exception ignored) {
                }
            }

            cells.clear();
            cells.addAll(built);

            Log.d(WidgetLog.TAG, "onDataSetChanged widget=" + widgetId + " media=" + media
                    + " payload=" + (json != null) + " cells=" + cells.size()
                    + " took=" + (System.currentTimeMillis() - start) + "ms");
        }

        // Cells carry their poster as a small RGB_565 bitmap, sized so the whole list
        // fits the launcher's ~2MB RemoteViews cache: with every cell cached, recycling
        // a row while scrolling is a plain setImageBitmap - no file read, no decode.
        private RemoteViews buildCell(JSONObject item) throws Exception {
            RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_item);

            pinHeight(cell, R.id.item_poster);

            android.graphics.Bitmap poster = WidgetApi.posterBitmap(context, item.optString("posterUrl", null));

            if (poster != null) {
                cell.setImageViewBitmap(R.id.item_poster, poster);
                cell.setViewVisibility(R.id.item_fallback, View.GONE);
            } else {
                // Same fallback the app's PosterCard has: the title on the card
                // background. The placeholder card keeps the cell's 2:3 shape.
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

        // A card-shaped gray cell that pulses (a ViewFlipper fading a soft highlight in
        // and out - RemoteViews can't run property animations, but flippers auto-start).
        private RemoteViews skeletonCell() {
            RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_item_skeleton);
            pinHeight(cell, R.id.skeleton_poster);
            cell.setImageViewBitmap(R.id.skeleton_poster, WidgetApi.placeholderBitmap(context));
            return cell;
        }

        // Fixed cell heights keep the grid's measurement independent of the images (see
        // WidgetRenderer.cellHeightDp). Pre-Android 12 keeps the adjustViewBounds
        // fallback, since setViewLayoutHeight doesn't exist there.
        private void pinHeight(RemoteViews cell, int viewId) {
            if (android.os.Build.VERSION.SDK_INT >= 31 && cellHeightDp > 0)
                cell.setViewLayoutHeight(viewId, cellHeightDp, android.util.TypedValue.COMPLEX_UNIT_DIP);
        }

        @Override
        public RemoteViews getViewAt(int position) {
            long start = System.currentTimeMillis();

            RemoteViews cell = position < 0 || position >= cells.size() ? skeletonCell() : cells.get(position);

            long took = System.currentTimeMillis() - start;
            Log.d(WidgetLog.TAG, "getViewAt widget=" + widgetId + " position=" + position
                    + (took > 1 ? " took=" + took + "ms" : ""));

            return cell;
        }

        @Override
        public RemoteViews getLoadingView() {
            // Only ever visible for the instant before onDataSetChanged first completes.
            Log.d(WidgetLog.TAG, "getLoadingView widget=" + widgetId);
            return skeletonCell();
        }

        @Override
        public int getCount() {
            return cells.size();
        }

        @Override
        public int getViewTypeCount() {
            // Poster cells and skeleton cells inflate different layouts.
            return 2;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }

        @Override
        public void onCreate() {
            Log.d(WidgetLog.TAG, "factory onCreate widget=" + widgetId);
        }

        @Override
        public void onDestroy() {
            Log.d(WidgetLog.TAG, "factory onDestroy widget=" + widgetId);
        }
    }
}

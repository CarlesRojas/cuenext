package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import app.cuenext.pinya.R;

/**
 * Backs the widget's scrolling grid. The factory is where the data work happens:
 * onDataSetChanged may block, so it refreshes the sections payload from the Convex
 * endpoint when the cache has aged and pre-downloads the posters; getViewAt then builds
 * each PosterCard cell purely from disk. Cell taps go through the grid's single
 * PendingIntent template (WidgetActionActivity) with per-cell fill-in intents.
 */
public class WidgetGridService extends RemoteViewsService {

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
        private static final long STALE_AFTER_MS = 5 * 60 * 1000;

        private final Context context;
        private final int widgetId;
        private final List<JSONObject> items = new ArrayList<>();

        GridFactory(Context context, int widgetId) {
            this.context = context;
            this.widgetId = widgetId;
        }

        @Override
        public void onDataSetChanged() {
            String media = WidgetPrefs.getMedia(context, widgetId);

            boolean hadPayload = WidgetPrefs.getCachedSections(context, media) != null;

            if (WidgetPrefs.isConnected(context)
                    && WidgetPrefs.getCachedSectionsAge(context, media) > STALE_AFTER_MS) {
                String json = WidgetApi.fetchSections(context, media);

                if (json != null) {
                    WidgetPrefs.setCachedSections(context, media, json);
                    WidgetApi.prefetchPosters(context, json);
                }

                // The shell around the grid (empty-view text, reconnect message after a
                // 401) was rendered from the pre-fetch state; have the provider repaint
                // it. Never loops: on the next pass the cache is fresh and this branch is
                // skipped.
                if (json != null && !hadPayload || WidgetPrefs.isTokenRejected(context))
                    context.sendBroadcast(new Intent(context, WatchlistWidgetProvider.class)
                            .setAction(WatchlistWidgetProvider.ACTION_HEADER_SYNC));
            }

            items.clear();

            String json = WidgetPrefs.getCachedSections(context, media);
            if (json == null) return;

            try {
                JSONArray sections = new JSONObject(json).getJSONArray("sections");

                String sectionKey = WidgetPrefs.getSection(context, widgetId, media);
                JSONObject section = sections.getJSONObject(0);
                for (int i = 0; i < sections.length(); i++) {
                    if (sections.getJSONObject(i).getString("key").equals(sectionKey)) {
                        section = sections.getJSONObject(i);
                        break;
                    }
                }

                JSONArray sectionItems = section.getJSONArray("items");
                for (int i = 0; i < sectionItems.length(); i++) items.add(sectionItems.getJSONObject(i));
            } catch (Exception ignored) {
            }
        }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_item);
            if (position >= items.size()) return cell;

            JSONObject item = items.get(position);

            try {
                Bitmap poster = WidgetApi.loadPoster(context, item.optString("posterUrl", null),
                        WidgetRenderer.POSTER_WIDTH_PX, WidgetRenderer.POSTER_HEIGHT_PX,
                        WidgetRenderer.POSTER_RADIUS_PX);

                if (poster != null) {
                    cell.setImageViewBitmap(R.id.item_poster, poster);
                    cell.setViewVisibility(R.id.item_fallback, View.GONE);
                } else {
                    // Same fallback the app's PosterCard has: the title on the card
                    // background. The placeholder bitmap keeps the cell's 2:3 shape.
                    cell.setImageViewBitmap(R.id.item_poster,
                            WidgetApi.placeholder(WidgetRenderer.POSTER_WIDTH_PX,
                                    WidgetRenderer.POSTER_HEIGHT_PX, WidgetRenderer.POSTER_RADIUS_PX));
                    cell.setViewVisibility(R.id.item_fallback, View.VISIBLE);
                    cell.setTextViewText(R.id.item_fallback, item.getString("name"));
                }

                if (item.has("progress")) {
                    cell.setViewVisibility(R.id.item_progress, View.VISIBLE);
                    cell.setProgressBar(R.id.item_progress, 100, item.getInt("progress"), false);
                } else {
                    cell.setViewVisibility(R.id.item_progress, View.GONE);
                }

                String appUrl = item.getString("appUrl");

                renderButton(cell, item, appUrl);

                cell.setOnClickFillInIntent(R.id.item_root,
                        new Intent().putExtra(WatchlistWidgetProvider.EXTRA_URL, appUrl));
            } catch (Exception ignored) {
            }

            return cell;
        }

        // The same corner button the app puts on the card: watch (eye, with the E5 /
        // S2, E5 label on shows) marking the item watched in place, or rate (star,
        // wearing the given rating) opening the title in the app.
        private void renderButton(RemoteViews cell, JSONObject item, String appUrl) throws Exception {
            JSONObject button = item.getJSONObject("button");
            String kind = button.getString("kind");

            if (kind.equals("none")) {
                cell.setViewVisibility(R.id.item_button, View.GONE);
                return;
            }

            cell.setViewVisibility(R.id.item_button, View.VISIBLE);

            if (kind.equals("watch")) {
                cell.setImageViewResource(R.id.item_button_icon, R.drawable.ic_widget_eye);
                cell.setInt(R.id.item_button_icon, "setColorFilter", 0xFFFFFFFF);

                String text = button.optString("text", "");
                if (text.isEmpty()) {
                    cell.setViewVisibility(R.id.item_button_text, View.GONE);
                } else {
                    cell.setViewVisibility(R.id.item_button_text, View.VISIBLE);
                    cell.setTextViewText(R.id.item_button_text, text);
                }

                cell.setOnClickFillInIntent(R.id.item_button, new Intent().putExtra(
                        WatchlistWidgetProvider.EXTRA_WATCH_JSON, item.getJSONObject("watch").toString()));
                return;
            }

            // rate: rating happens in the app's dialog, so tapping opens the title there.
            boolean rated = !button.isNull("rating");

            cell.setImageViewResource(R.id.item_button_icon, R.drawable.ic_widget_star);
            cell.setInt(R.id.item_button_icon, "setColorFilter",
                    rated ? WidgetRenderer.COLOR_RATED : 0xFFFFFFFF);

            if (rated) {
                cell.setViewVisibility(R.id.item_button_text, View.VISIBLE);
                cell.setTextViewText(R.id.item_button_text, String.valueOf(button.getInt("rating")));
            } else {
                cell.setViewVisibility(R.id.item_button_text, View.GONE);
            }

            cell.setOnClickFillInIntent(R.id.item_button,
                    new Intent().putExtra(WatchlistWidgetProvider.EXTRA_URL, appUrl));
        }

        @Override
        public int getCount() {
            return items.size();
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
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
        public void onCreate() {}

        @Override
        public void onDestroy() {}
    }
}

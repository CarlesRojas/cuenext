package app.cuenext.pinya.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.cuenext.pinya.R;

/**
 * Builds the RemoteViews for one widget instance from the cached sections payload,
 * mirroring the app's horizontal lists: same section titles, poster cards with rounded
 * corners, the watch / rate corner button, the progress bar, and the Shows/Movies toggle
 * (the collapsed sidebar's MediaTypeSelector, laid out horizontally) in the top right.
 */
public final class WidgetRenderer {
    private static final String SITE_URL = "https://www.cuenext.app";

    // The app's palette: sky-500 for the active media type, amber-500 for a given rating.
    private static final int COLOR_ACCENT = 0xFF0EA5E9;
    private static final int COLOR_ICON = 0xB3FFFFFF;
    private static final int COLOR_RATED = 0xFFF59E0B;

    // A poster card is 144x216 CSS px with a 22px radius in the app; the widget keeps the
    // same 2:3 shape and radius ratio at a size that fits a home screen row.
    private static final int CELL_WIDTH_DP = 96;
    private static final int CELL_HEIGHT_DP = 144;
    private static final int CELL_GAP_DP = 8;
    private static final float CELL_RADIUS_DP = CELL_WIDTH_DP * 22f / 144f;
    private static final int ROOT_PADDING_DP = 24;

    private WidgetRenderer() {}

    public static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        String media = WidgetPrefs.getMedia(context, widgetId);
        String section = WidgetPrefs.getSection(context, widgetId, media);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_watchlist);

        renderToggle(context, views, widgetId, media);
        views.setTextViewText(R.id.widget_title, sectionTitle(media, section));

        if (!WidgetPrefs.isConnected(context) || WidgetPrefs.isTokenRejected(context)) {
            showMessage(context, views, widgetId, context.getString(R.string.widgetConnectMessage),
                    SITE_URL + "/profile?media=" + media);
            manager.updateAppWidget(widgetId, views);
            return;
        }

        String json = WidgetPrefs.getCachedSections(context, media);

        if (json == null) {
            showMessage(context, views, widgetId, context.getString(R.string.widgetLoadingMessage),
                    SITE_URL + "/?media=" + media);
            manager.updateAppWidget(widgetId, views);
            return;
        }

        try {
            renderSections(context, manager, views, widgetId, media, section, json);
        } catch (Exception e) {
            showMessage(context, views, widgetId, context.getString(R.string.widgetLoadingMessage),
                    SITE_URL + "/?media=" + media);
        }

        manager.updateAppWidget(widgetId, views);
    }

    private static void renderSections(Context context, AppWidgetManager manager, RemoteViews views, int widgetId,
            String media, String sectionKey, String json) throws Exception {
        JSONArray sections = new JSONObject(json).getJSONArray("sections");

        JSONObject section = sections.getJSONObject(0);
        for (int i = 0; i < sections.length(); i++) {
            if (sections.getJSONObject(i).getString("key").equals(sectionKey)) {
                section = sections.getJSONObject(i);
                break;
            }
        }

        views.setTextViewText(R.id.widget_title, section.getString("title"));

        JSONArray items = section.getJSONArray("items");

        if (items.length() == 0) {
            showMessage(context, views, widgetId, context.getString(R.string.widgetEmptyMessage),
                    SITE_URL + "/?media=" + media);
            return;
        }

        views.setViewVisibility(R.id.widget_message, View.GONE);
        views.setViewVisibility(R.id.widget_row, View.VISIBLE);
        views.removeAllViews(R.id.widget_row);

        float density = context.getResources().getDisplayMetrics().density;
        int cellWidthPx = Math.round(CELL_WIDTH_DP * density);
        int cellHeightPx = Math.round(CELL_HEIGHT_DP * density);
        float radiusPx = CELL_RADIUS_DP * density;

        int count = Math.min(items.length(), cellCount(manager, widgetId));

        for (int i = 0; i < count; i++) {
            JSONObject item = items.getJSONObject(i);
            RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_item);

            Bitmap poster = WidgetApi.loadPoster(context, item.optString("posterUrl", null), cellWidthPx,
                    cellHeightPx, radiusPx);

            if (poster != null) {
                cell.setImageViewBitmap(R.id.item_poster, poster);
                cell.setViewVisibility(R.id.item_fallback, View.GONE);
            } else {
                // Same fallback the app's PosterCard has: the title on the card background.
                cell.setViewVisibility(R.id.item_fallback, View.VISIBLE);
                cell.setTextViewText(R.id.item_fallback, item.getString("name"));
            }

            renderButton(context, cell, widgetId, i, item);

            if (item.has("progress")) {
                cell.setViewVisibility(R.id.item_progress, View.VISIBLE);
                cell.setProgressBar(R.id.item_progress, 100, item.getInt("progress"), false);
            } else {
                cell.setViewVisibility(R.id.item_progress, View.GONE);
            }

            String appUrl = item.getString("appUrl");
            cell.setOnClickPendingIntent(R.id.item_root,
                    openAppIntent(context, appUrl, requestCode(widgetId, i, 0)));

            views.addView(R.id.widget_row, cell);
        }
    }

    // The same corner button the app puts on the card: watch (eye, with the E5 / S2, E5
    // label on shows) marking the item watched in place, or rate (star, wearing the given
    // rating) opening the title in the app.
    private static void renderButton(Context context, RemoteViews cell, int widgetId, int index, JSONObject item)
            throws Exception {
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

            Intent intent = new Intent(context, WatchlistWidgetProvider.class)
                    .setAction(WatchlistWidgetProvider.ACTION_WATCH)
                    .setData(Uri.parse("cuenext://widget/" + widgetId + "/watch/" + index))
                    .putExtra(WatchlistWidgetProvider.EXTRA_WATCH_JSON, item.getJSONObject("watch").toString());

            cell.setOnClickPendingIntent(R.id.item_button,
                    PendingIntent.getBroadcast(context, requestCode(widgetId, index, 1), intent, pendingFlags()));
            return;
        }

        // rate: the star wears the user's rating like the app's PosterRateButton; rating
        // happens in the app's dialog, so tapping opens the title there.
        boolean rated = !button.isNull("rating");

        cell.setImageViewResource(R.id.item_button_icon, R.drawable.ic_widget_star);
        cell.setInt(R.id.item_button_icon, "setColorFilter", rated ? COLOR_RATED : 0xFFFFFFFF);

        if (rated) {
            cell.setViewVisibility(R.id.item_button_text, View.VISIBLE);
            cell.setTextViewText(R.id.item_button_text, String.valueOf(button.getInt("rating")));
        } else {
            cell.setViewVisibility(R.id.item_button_text, View.GONE);
        }

        cell.setOnClickPendingIntent(R.id.item_button,
                openAppIntent(context, item.getString("appUrl"), requestCode(widgetId, index, 1)));
    }

    private static void renderToggle(Context context, RemoteViews views, int widgetId, String media) {
        boolean tv = media.equals("tv");

        views.setInt(R.id.toggle_tv_wrap, "setBackgroundResource",
                tv ? R.drawable.widget_toggle_selected : 0);
        views.setInt(R.id.toggle_movie_wrap, "setBackgroundResource",
                tv ? 0 : R.drawable.widget_toggle_selected);
        views.setInt(R.id.toggle_tv, "setColorFilter", tv ? COLOR_ACCENT : COLOR_ICON);
        views.setInt(R.id.toggle_movie, "setColorFilter", tv ? COLOR_ICON : COLOR_ACCENT);

        views.setOnClickPendingIntent(R.id.toggle_tv_wrap, setMediaIntent(context, widgetId, "tv"));
        views.setOnClickPendingIntent(R.id.toggle_movie_wrap, setMediaIntent(context, widgetId, "movie"));
    }

    private static void showMessage(Context context, RemoteViews views, int widgetId, String message, String url) {
        views.setViewVisibility(R.id.widget_row, View.GONE);
        views.setViewVisibility(R.id.widget_message, View.VISIBLE);
        views.setTextViewText(R.id.widget_message, message);
        views.setOnClickPendingIntent(R.id.widget_message,
                openAppIntent(context, url, requestCode(widgetId, 99, 2)));
    }

    private static PendingIntent setMediaIntent(Context context, int widgetId, String media) {
        Intent intent = new Intent(context, WatchlistWidgetProvider.class)
                .setAction(WatchlistWidgetProvider.ACTION_SET_MEDIA)
                .setData(Uri.parse("cuenext://widget/" + widgetId + "/media/" + media))
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                .putExtra(WatchlistWidgetProvider.EXTRA_MEDIA, media);

        int code = requestCode(widgetId, media.equals("tv") ? 0 : 1, 3);
        return PendingIntent.getBroadcast(context, code, intent, pendingFlags());
    }

    /** Opens the TWA on the given URL, e.g. a title's page or the watchlist. */
    private static PendingIntent openAppIntent(Context context, String url, int code) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url))
                .setPackage(context.getPackageName())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        return PendingIntent.getActivity(context, code, intent, pendingFlags());
    }

    private static int pendingFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    private static int requestCode(int widgetId, int index, int kind) {
        return widgetId * 1000 + index * 10 + kind;
    }

    private static int cellCount(AppWidgetManager manager, int widgetId) {
        Bundle options = manager.getAppWidgetOptions(widgetId);
        int minWidthDp = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) : 0;
        if (minWidthDp <= 0) minWidthDp = 4 * 73; // a typical 4-column widget when unknown

        int inner = minWidthDp - ROOT_PADDING_DP;
        return Math.max(1, (inner + CELL_GAP_DP) / (CELL_WIDTH_DP + CELL_GAP_DP));
    }

    /** The app's section titles, used before the first payload arrives. */
    public static String sectionTitle(String media, String key) {
        if (media.equals("tv")) {
            switch (key) {
                case "unstarted": return "Haven't started";
                case "waiting": return "Waiting for episodes";
                case "stopped": return "Stopped watching";
                case "finished": return "Finished";
                default: return "Watch next";
            }
        }

        switch (key) {
            case "waiting": return "Not released yet";
            case "finished": return "Finished";
            default: return "Watch next";
        }
    }
}

package app.cuenext.pinya.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import app.cuenext.pinya.R;

/**
 * Builds the RemoteViews shell of one widget instance: the header (section title plus the
 * Shows/Movies toggle, the collapsed sidebar's MediaTypeSelector laid out horizontally),
 * the vertically scrolling poster grid bound to WidgetGridService, and the message shown
 * when there is nothing to render. The grid shows 1, 2 or 3 covers per row depending on
 * the width the widget was given; GridView.setNumColumns is not remotable, so the count
 * is picked by choosing between three otherwise identical layouts.
 */
public final class WidgetRenderer {
    public static final String SITE_URL = "https://www.cuenext.app";

    // The app's palette: sky-500 for the active media type.
    public static final int COLOR_ACCENT = 0xFF0EA5E9;
    public static final int COLOR_ICON = 0xB3FFFFFF;

    // Poster bitmaps are produced at the w342 source size in the card's 2:3 shape, with
    // the app's 22/144 corner ratio; cells then scale them to the column width.
    public static final int POSTER_WIDTH_PX = 342;
    public static final int POSTER_HEIGHT_PX = 513;
    public static final float POSTER_RADIUS_PX = POSTER_WIDTH_PX * 22f / 144f;

    private WidgetRenderer() {}

    public static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        String media = WidgetPrefs.getMedia(context, widgetId);
        String section = WidgetPrefs.getSection(context, widgetId);

        RemoteViews views = new RemoteViews(context.getPackageName(), gridLayout(manager, widgetId));

        // Only lists that exist for Shows & Movies carry the toggle; a single-media list
        // pins the widget and the toggle would be dead weight.
        if (WidgetPrefs.isBothMedia(context, widgetId)) {
            views.setViewVisibility(R.id.widget_toggle, View.VISIBLE);
            renderToggle(context, views, widgetId, media);
        } else {
            views.setViewVisibility(R.id.widget_toggle, View.GONE);
        }

        views.setTextViewText(R.id.widget_title, sectionTitle(media, section));
        // The list lives on the watchlist page; open it on the media the toggle is on.
        views.setOnClickPendingIntent(R.id.widget_title,
                openAppIntent(context, SITE_URL + "/?media=" + media, requestCode(widgetId, 2)));

        boolean connected = WidgetPrefs.isConnected(context) && !WidgetPrefs.isTokenRejected(context);

        if (!connected) {
            // The app's primary-button CTA instead of a bare instruction; it opens the
            // profile page anchored to the widget card, where access is granted.
            views.setViewVisibility(R.id.widget_connect, View.VISIBLE);
            views.setViewVisibility(R.id.widget_message, View.GONE);
            views.setOnClickPendingIntent(R.id.widget_connect,
                    openAppIntent(context, SITE_URL + "/profile?media=" + media + "#widget", requestCode(widgetId, 3)));
            manager.updateAppWidget(widgetId, views);
            return;
        }

        views.setViewVisibility(R.id.widget_connect, View.GONE);

        // The grid's empty view; while a payload is missing the factory fills the grid
        // with skeleton cells instead, so this only shows for a genuinely empty list.
        views.setTextViewText(R.id.widget_message, context.getString(R.string.widgetEmptyMessage));
        views.setOnClickPendingIntent(R.id.widget_message,
                openAppIntent(context, SITE_URL + "/?media=" + media, requestCode(widgetId, 4)));

        Intent adapter = new Intent(context, WidgetGridService.class)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                // Launchers cache adapter connections by filterEquals, which ignores
                // extras; the widget id in the data URI keeps instances separate.
                .setData(Uri.parse("cuenext://widget-grid/" + widgetId));

        views.setRemoteAdapter(R.id.widget_grid, adapter);
        views.setEmptyView(R.id.widget_grid, R.id.widget_message);

        // One template for every cell tap; cells fill in the title url to open. It has
        // to stay mutable so the launcher can apply the fill-ins.
        Intent template = new Intent(context, WidgetActionActivity.class)
                .setData(Uri.parse("cuenext://widget-action/" + widgetId));
        views.setPendingIntentTemplate(R.id.widget_grid,
                PendingIntent.getActivity(context, widgetId, template, mutableFlags()));

        manager.updateAppWidget(widgetId, views);
    }

    // Thresholds in launcher terms: ~2 cells wide shows one cover per row, 3 cells wide
    // shows two, 4 cells and up shows three.
    private static int gridLayout(AppWidgetManager manager, int widgetId) {
        Bundle options = manager.getAppWidgetOptions(widgetId);
        int minWidthDp = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) : 0;
        if (minWidthDp <= 0) minWidthDp = 276; // a typical 4-column widget when unknown

        if (minWidthDp < 170) return R.layout.widget_watchlist_1col;
        if (minWidthDp < 240) return R.layout.widget_watchlist_2col;
        return R.layout.widget_watchlist_3col;
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

    private static PendingIntent setMediaIntent(Context context, int widgetId, String media) {
        Intent intent = new Intent(context, WatchlistWidgetProvider.class)
                .setAction(WatchlistWidgetProvider.ACTION_SET_MEDIA)
                .setData(Uri.parse("cuenext://widget/" + widgetId + "/media/" + media))
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                .putExtra(WatchlistWidgetProvider.EXTRA_MEDIA, media);

        int code = widgetId * 10 + (media.equals("tv") ? 0 : 1);
        return PendingIntent.getBroadcast(context, code, intent, immutableFlags());
    }

    /** Opens the TWA on the given URL, e.g. a title's page or the watchlist. */
    private static PendingIntent openAppIntent(Context context, String url, int code) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url))
                .setPackage(context.getPackageName())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        return PendingIntent.getActivity(context, code, intent, immutableFlags());
    }

    private static int requestCode(int widgetId, int kind) {
        return widgetId * 10 + kind;
    }

    private static int immutableFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    private static int mutableFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
        return flags;
    }

    /** The app's section titles; the payload carries the same strings. */
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

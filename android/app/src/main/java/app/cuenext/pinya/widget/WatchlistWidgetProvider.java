package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The CueNext watchlist widget. The provider only paints the RemoteViews shell and pokes
 * the grid; the actual data fetching lives in WidgetGridService's factory, whose
 * onDataSetChanged is allowed to block on the network. The one network call made here is
 * the mark-watched POST, run on an executor inside goAsync()'s window.
 */
public class WatchlistWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_SET_MEDIA = "app.cuenext.pinya.widget.SET_MEDIA";
    public static final String ACTION_WATCH = "app.cuenext.pinya.widget.WATCH";
    public static final String ACTION_REFRESH = "app.cuenext.pinya.widget.REFRESH";
    // Repaint the shells without poking the grid; sent by the factory after a fetch that
    // changed what the shell should say (first payload, or a rejected token).
    public static final String ACTION_HEADER_SYNC = "app.cuenext.pinya.widget.HEADER_SYNC";

    public static final String EXTRA_MEDIA = "media";
    public static final String EXTRA_WATCH_JSON = "watchJson";
    public static final String EXTRA_URL = "url";

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (ACTION_SET_MEDIA.equals(action)) {
            int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
            String media = intent.getStringExtra(EXTRA_MEDIA);

            if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID && media != null) {
                WidgetPrefs.setMedia(context, widgetId, media);
                render(context, new int[] { widgetId }, true);
            }
            return;
        }

        if (ACTION_WATCH.equals(action)) {
            final String watchJson = intent.getStringExtra(EXTRA_WATCH_JSON);
            if (watchJson == null) return;

            final Context app = context.getApplicationContext();
            final PendingResult result = goAsync();

            EXECUTOR.execute(() -> {
                try {
                    String media = "tv";
                    try {
                        media = new org.json.JSONObject(watchJson).optString("media", "tv");
                    } catch (Exception ignored) {
                    }

                    // The POST answers with the refreshed sections, so the repaint below
                    // already shows the item gone (or the show's next episode).
                    String refreshed = WidgetApi.postWatch(app, watchJson);

                    if (refreshed != null) {
                        WidgetPrefs.setCachedSections(app, media, refreshed);
                        WidgetApi.prefetchPosters(app, refreshed);
                    }

                    render(app, allWidgetIds(app), true);
                } finally {
                    result.finish();
                }
            });
            return;
        }

        if (ACTION_REFRESH.equals(action)) {
            // Aging out the cache makes the factories refetch on the poke below.
            WidgetPrefs.invalidateCache(context);
            render(context, allWidgetIds(context), true);
            return;
        }

        if (ACTION_HEADER_SYNC.equals(action)) {
            render(context, allWidgetIds(context), false);
            return;
        }

        super.onReceive(context, intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        // Poking the grid makes each factory refresh its data when the cache has aged;
        // this is also the periodic (updatePeriodMillis) refresh path.
        render(context, widgetIds, true);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        // A resize can change the column count, which is baked into the layout choice.
        render(context, new int[] { widgetId }, false);
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        for (int widgetId : widgetIds) WidgetPrefs.deleteWidget(context, widgetId);
    }

    /** Entry point for the config and pairing activities, which run outside a broadcast. */
    public static void requestRefresh(Context context) {
        context.sendBroadcast(new Intent(context, WatchlistWidgetProvider.class).setAction(ACTION_REFRESH));
    }

    private static void render(Context context, int[] widgetIds, boolean notifyData) {
        if (widgetIds == null || widgetIds.length == 0) return;

        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        for (int widgetId : widgetIds) WidgetRenderer.updateWidget(context, manager, widgetId);

        if (notifyData) manager.notifyAppWidgetViewDataChanged(widgetIds, app.cuenext.pinya.R.id.widget_grid);
    }

    private static int[] allWidgetIds(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, WatchlistWidgetProvider.class));
    }
}

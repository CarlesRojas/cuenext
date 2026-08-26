package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The CueNext watchlist widget. Renders instantly from the cached payload, then refreshes
 * it from the Convex widget endpoints in the background. All work runs on an executor
 * inside goAsync()'s window, because widget broadcasts arrive on the main thread and the
 * process may be torn down as soon as onReceive returns.
 */
public class WatchlistWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_SET_MEDIA = "app.cuenext.pinya.widget.SET_MEDIA";
    public static final String ACTION_WATCH = "app.cuenext.pinya.widget.WATCH";
    public static final String ACTION_REFRESH = "app.cuenext.pinya.widget.REFRESH";

    public static final String EXTRA_MEDIA = "media";
    public static final String EXTRA_WATCH_JSON = "watchJson";

    // Refetch on launcher-driven updates only when the cache has actually aged; toggles
    // and reconfigurations repaint from cache immediately either way.
    private static final long STALE_AFTER_MS = 5 * 60 * 1000;

    private static final ExecutorService EXECUTOR = Executors.newFixedThreadPool(2);

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (ACTION_SET_MEDIA.equals(action)) {
            int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
            String media = intent.getStringExtra(EXTRA_MEDIA);

            if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID && media != null) {
                WidgetPrefs.setMedia(context, widgetId, media);
                runAsync(context, new int[] { widgetId }, false);
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

                    String refreshed = WidgetApi.postWatch(app, watchJson);

                    if (refreshed != null) {
                        WidgetPrefs.setCachedSections(app, media, refreshed);
                        WidgetApi.prefetchPosters(app, refreshed);
                    }

                    renderAll(app);
                } finally {
                    result.finish();
                }
            });
            return;
        }

        if (ACTION_REFRESH.equals(action)) {
            runAsync(context, allWidgetIds(context), true);
            return;
        }

        super.onReceive(context, intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        runAsync(context, widgetIds, true);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        runAsync(context, new int[] { widgetId }, false);
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        for (int widgetId : widgetIds) WidgetPrefs.deleteWidget(context, widgetId);
    }

    /** Entry point for the config and pairing activities, which run outside a broadcast. */
    public static void requestRefresh(Context context) {
        Intent intent = new Intent(context, WatchlistWidgetProvider.class).setAction(ACTION_REFRESH);
        context.sendBroadcast(intent);
    }

    private void runAsync(Context context, int[] widgetIds, boolean forceFetch) {
        if (widgetIds == null || widgetIds.length == 0) return;

        final Context app = context.getApplicationContext();
        final PendingResult result = goAsync();

        EXECUTOR.execute(() -> {
            try {
                AppWidgetManager manager = AppWidgetManager.getInstance(app);

                // First paint from whatever is cached, so the widget never blocks on the
                // network.
                for (int widgetId : widgetIds) WidgetRenderer.updateWidget(app, manager, widgetId);

                if (!WidgetPrefs.isConnected(app)) return;

                Set<String> medias = new HashSet<>();
                for (int widgetId : widgetIds) medias.add(WidgetPrefs.getMedia(app, widgetId));

                boolean changed = false;
                for (String media : medias) {
                    boolean stale = WidgetPrefs.getCachedSectionsAge(app, media) > STALE_AFTER_MS;
                    if (!forceFetch && !stale) continue;

                    String json = WidgetApi.fetchSections(app, media);
                    if (json != null) {
                        WidgetPrefs.setCachedSections(app, media, json);
                        WidgetApi.prefetchPosters(app, json);
                        changed = true;
                    }
                }

                boolean tokenNowRejected = WidgetPrefs.isTokenRejected(app);

                if (changed || tokenNowRejected)
                    for (int widgetId : widgetIds) WidgetRenderer.updateWidget(app, manager, widgetId);
            } finally {
                result.finish();
            }
        });
    }

    private static void renderAll(Context app) {
        AppWidgetManager manager = AppWidgetManager.getInstance(app);
        for (int widgetId : allWidgetIds(app)) WidgetRenderer.updateWidget(app, manager, widgetId);
    }

    private static int[] allWidgetIds(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, WatchlistWidgetProvider.class));
    }
}

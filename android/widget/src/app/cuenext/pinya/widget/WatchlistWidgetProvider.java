package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import java.util.Arrays;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The CueNext watchlist widget. The provider paints the RemoteViews shell and owns ALL
 * networking, so the widget's traffic is easy to reason about: one sections fetch per
 * displayed media type, only when its cache is older than STALE_AFTER_MS, on launcher
 * updates (every updatePeriodMillis), a toggle to an uncached media, or a pairing/config
 * refresh. Scrolling never touches the network - the grid factory renders purely from
 * the cache and shows pulsing skeleton cells until the first payload lands.
 */
public class WatchlistWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_SET_MEDIA = "app.cuenext.pinya.widget.SET_MEDIA";
    public static final String ACTION_REFRESH = "app.cuenext.pinya.widget.REFRESH";

    public static final String EXTRA_MEDIA = "media";
    public static final String EXTRA_URL = "url";

    // Fresh enough for a watchlist that changes a few times a day, while a toggle back
    // and forth within the window repaints instantly with no request at all.
    private static final long STALE_AFTER_MS = 10 * 60 * 1000;

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(WidgetLog.TAG, "provider onReceive " + action);

        if (ACTION_SET_MEDIA.equals(action)) {
            int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
            String media = intent.getStringExtra(EXTRA_MEDIA);

            if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID && media != null) {
                WidgetPrefs.setMedia(context, widgetId, media);
                // Repaint right away: cached covers if the media was seen recently,
                // skeleton cells otherwise while the fetch below fills the cache.
                renderAndNotify(context, new int[] { widgetId });
                fetchStaleThenRepaint(context, new int[] { widgetId });
            }
            return;
        }

        if (ACTION_REFRESH.equals(action)) {
            // Pairing and (re)configuration want fresh data: age the cache out so the
            // fetch below actually runs.
            WidgetPrefs.invalidateCache(context);
            int[] widgetIds = allWidgetIds(context);
            renderAndNotify(context, widgetIds);
            fetchStaleThenRepaint(context, widgetIds);
            return;
        }

        super.onReceive(context, intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        renderAndNotify(context, widgetIds);
        fetchStaleThenRepaint(context, widgetIds);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int widgetId, Bundle newOptions) {
        // A resize can change the column count (baked into the layout choice) and the
        // pinned cell height (baked into the cells), so the grid is poked too.
        Log.d(WidgetLog.TAG, "onAppWidgetOptionsChanged widget=" + widgetId);
        renderAndNotify(context, new int[] { widgetId });
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        for (int widgetId : widgetIds) WidgetPrefs.deleteWidget(context, widgetId);
    }

    /** Entry point for the config and pairing activities, which run outside a broadcast. */
    public static void requestRefresh(Context context) {
        context.sendBroadcast(new Intent(context, WatchlistWidgetProvider.class).setAction(ACTION_REFRESH));
    }

    /** Repaints the shells and pokes the grids so their factories rebuild from the cache. */
    private static void renderAndNotify(Context context, int[] widgetIds) {
        if (widgetIds == null || widgetIds.length == 0) return;

        Log.d(WidgetLog.TAG, "renderAndNotify widgets=" + Arrays.toString(widgetIds));

        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        for (int widgetId : widgetIds) WidgetRenderer.updateWidget(context, manager, widgetId);

        manager.notifyAppWidgetViewDataChanged(widgetIds, app.cuenext.pinya.R.id.widget_grid);
    }

    /**
     * The one network path. Fetches the sections of each displayed media type whose
     * cache has aged out, pre-downloads the posters, and repaints. Runs inside
     * goAsync()'s window because the process may be torn down after onReceive returns.
     */
    private void fetchStaleThenRepaint(Context context, int[] widgetIds) {
        if (widgetIds == null || widgetIds.length == 0 || !WidgetPrefs.isConnected(context)) return;

        final Context app = context.getApplicationContext();
        final PendingResult result = goAsync();

        EXECUTOR.execute(() -> {
            try {
                Set<String> medias = new HashSet<>();
                Set<String> sectionsInUse = new HashSet<>();
                for (int widgetId : widgetIds) {
                    medias.add(WidgetPrefs.getMedia(app, widgetId));
                    sectionsInUse.add(WidgetPrefs.getSection(app, widgetId));
                }

                boolean changed = false;
                for (String media : medias) {
                    if (WidgetPrefs.getCachedSectionsAge(app, media) <= STALE_AFTER_MS) continue;

                    long start = System.currentTimeMillis();
                    String json = WidgetApi.fetchSections(app, media);
                    Log.d(WidgetLog.TAG, "fetchSections media=" + media + " ok=" + (json != null)
                            + " took=" + (System.currentTimeMillis() - start) + "ms");

                    if (json != null) {
                        WidgetPrefs.setCachedSections(app, media, json);

                        start = System.currentTimeMillis();
                        WidgetApi.prefetchPosters(app, json, sectionsInUse);
                        Log.d(WidgetLog.TAG, "prefetchPosters media=" + media
                                + " took=" + (System.currentTimeMillis() - start) + "ms");

                        changed = true;
                    }
                }

                if (changed || WidgetPrefs.isTokenRejected(app)) renderAndNotify(app, widgetIds);
            } finally {
                result.finish();
            }
        });
    }

    private static int[] allWidgetIds(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, WatchlistWidgetProvider.class));
    }
}

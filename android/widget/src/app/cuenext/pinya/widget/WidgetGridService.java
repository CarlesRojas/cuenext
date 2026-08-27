package app.cuenext.pinya.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.List;

/**
 * Legacy adapter for pre-Android 12 launchers only. From API 31 on, WidgetRenderer hands
 * the launcher the whole collection with RemoteCollectionItems instead, which is what
 * keeps scrolling free of IPC and loading; this path virtualizes, so it asks for cells
 * one at a time. Either way the cells come from WidgetCells, prebuilt with their poster
 * bitmaps, and nothing here touches the network.
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
        private final Context context;
        private final int widgetId;
        private final List<RemoteViews> cells = new ArrayList<>();

        GridFactory(Context context, int widgetId) {
            this.context = context;
            this.widgetId = widgetId;
        }

        @Override
        public void onDataSetChanged() {
            cells.clear();
            cells.addAll(WidgetCells.build(context, AppWidgetManager.getInstance(context), widgetId));
            Log.d(WidgetLog.TAG, "legacy factory rebuilt widget=" + widgetId + " cells=" + cells.size());
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= cells.size()) return loadingCell();
            return cells.get(position);
        }

        @Override
        public RemoteViews getLoadingView() {
            return loadingCell();
        }

        private RemoteViews loadingCell() {
            return WidgetCells.skeletonCell(context,
                    WidgetRenderer.cellHeightDp(AppWidgetManager.getInstance(context), widgetId));
        }

        @Override
        public int getCount() {
            return cells.size();
        }

        @Override
        public int getViewTypeCount() {
            return 2;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDestroy() {}
    }
}

package app.cuenext.pinya.widget;

import android.app.Activity;
import android.os.Bundle;

import app.cuenext.pinya.LauncherActivity;

/**
 * Replaces the generated Application (apply-widget.sh swaps the manifest's android:name)
 * to watch the TWA's LauncherActivity: it runs when the app is opened and again when the
 * user backs out of a session, which are the moments watchlist data is most likely to
 * have just changed. Both force a widget refetch that ignores the staleness window, so
 * marking an episode watched in the app shows up on the widget as the user lands back on
 * the home screen. (Leaving the app with the home button is invisible to us - Chrome's
 * activity is on top then - so those sessions are picked up by the periodic refresh.)
 */
public class WidgetApplication extends app.cuenext.pinya.Application {
    // The open of a session fires started+resumed together, and a back-exit fires
    // resumed+destroyed; collapse each burst into one refetch.
    private static final long DEBOUNCE_MS = 15 * 1000;

    private long lastRefreshAt = 0;

    @Override
    public void onCreate() {
        super.onCreate();

        registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
            @Override
            public void onActivityStarted(Activity activity) {
                onLauncherEvent(activity);
            }

            @Override
            public void onActivityDestroyed(Activity activity) {
                onLauncherEvent(activity);
            }

            @Override
            public void onActivityCreated(Activity activity, Bundle savedInstanceState) {}

            @Override
            public void onActivityResumed(Activity activity) {}

            @Override
            public void onActivityPaused(Activity activity) {}

            @Override
            public void onActivityStopped(Activity activity) {}

            @Override
            public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}
        });
    }

    private void onLauncherEvent(Activity activity) {
        if (!(activity instanceof LauncherActivity)) return;
        if (!WidgetPrefs.isConnected(this)) return;

        long now = System.currentTimeMillis();
        if (now - lastRefreshAt < DEBOUNCE_MS) return;
        lastRefreshAt = now;

        WatchlistWidgetProvider.requestRefresh(this);
    }
}

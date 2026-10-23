package app.cuenext.pinya.widget;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import app.cuenext.pinya.R;

/**
 * Catches the cuenext://widget-setup?token=...&api=... deep link the web app navigates to
 * when the user taps "Connect widget" on their profile. This is the only way credentials
 * can reach native code from the TWA: the web session lives inside Chrome and there is no
 * JS bridge. Stores the pair and finishes without UI.
 */
public class WidgetTokenActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Uri data = getIntent().getData();
        String token = data != null ? data.getQueryParameter("token") : null;
        String apiBase = data != null ? data.getQueryParameter("api") : null;

        if (token != null && !token.isEmpty() && isConvexUrl(apiBase)) {
            WidgetPrefs.saveCredentials(this, token, apiBase);
            WatchlistWidgetProvider.requestRefresh(this);
            Toast.makeText(this, R.string.widgetConnectedToast, Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(this, R.string.widgetConnectFailedToast, Toast.LENGTH_LONG).show();
        }

        finish();
    }

    // Any app or page can fire a cuenext:// link, so only accept an API base that is a
    // Convex deployment; that keeps a hostile link from pointing the widget at an
    // attacker's server. Needs updating if the backend ever moves to a custom domain.
    private static boolean isConvexUrl(String apiBase) {
        if (apiBase == null || !apiBase.startsWith("https://")) return false;

        String host = Uri.parse(apiBase).getHost();
        return host != null && host.endsWith(".convex.site");
    }
}

package app.cuenext.pinya.widget;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import app.cuenext.pinya.R;

/**
 * Invisible target of the grid's PendingIntent template. Collection cells can only fire
 * fill-in intents at one template, so this dispatches: a `url` extra opens the TWA on
 * that page, a watch payload hands the mark-watched work to the provider (which does the
 * network call with goAsync) and confirms with a toast.
 */
public class WidgetActionActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String watchJson = getIntent().getStringExtra(WatchlistWidgetProvider.EXTRA_WATCH_JSON);
        String url = getIntent().getStringExtra(WatchlistWidgetProvider.EXTRA_URL);

        if (watchJson != null) {
            Toast.makeText(this, R.string.widgetMarkingWatchedToast, Toast.LENGTH_SHORT).show();
            sendBroadcast(new Intent(this, WatchlistWidgetProvider.class)
                    .setAction(WatchlistWidgetProvider.ACTION_WATCH)
                    .putExtra(WatchlistWidgetProvider.EXTRA_WATCH_JSON, watchJson));
        } else if (url != null) {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    .setPackage(getPackageName())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }

        finish();
    }
}

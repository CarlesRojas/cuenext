package app.cuenext.pinya.widget;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Invisible target of the grid's PendingIntent template: collection cells can't carry
 * their own PendingIntents, so their fill-in intents land here with the title's url,
 * which opens in the TWA.
 */
public class WidgetActionActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String url = getIntent().getStringExtra(WatchlistWidgetProvider.EXTRA_URL);

        if (url != null)
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    .setPackage(getPackageName())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));

        finish();
    }
}

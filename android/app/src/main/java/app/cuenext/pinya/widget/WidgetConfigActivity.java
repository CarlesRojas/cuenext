package app.cuenext.pinya.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * The widget's configuration screen: pick which of the app's lists the widget shows. One
 * flat list of every list the watchlist renders, each labelled with the media it exists
 * for; picking one that works for Shows & Movies gives the widget its toggle, a
 * single-media list pins the widget to that media and hides the toggle. Built
 * programmatically in the app's dark palette so no layout resources beyond the widget's
 * own are needed.
 */
public class WidgetConfigActivity extends Activity {
    // key, title, media ("both", "tv" or "movie"). Same order as the app's watchlist.
    private static final String[][] SECTIONS = {
            { "next", "Watch next", "both" },
            { "unstarted", "Haven't started", "tv" },
            { "waiting", "Waiting for episodes", "tv" },
            { "waiting", "Not released yet", "movie" },
            { "stopped", "Stopped watching", "tv" },
            { "finished", "Finished", "both" },
    };

    private static final int COLOR_BACKGROUND = 0xFF0A0A0A;
    private static final int COLOR_CARD = 0xFF262626;
    private static final int COLOR_CARD_BORDER = 0x66737373;
    private static final int COLOR_ACCENT = 0xFF0EA5E9;
    private static final int COLOR_MUTED = 0xFF737373;

    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bundle extras = getIntent().getExtras();
        if (extras != null)
            widgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);

        setResult(RESULT_CANCELED, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));

        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        setContentView(buildContent());
    }

    private View buildContent() {
        float density = getResources().getDisplayMetrics().density;
        int pad = Math.round(20 * density);

        final LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Choose a list");
        title.setTextColor(Color.WHITE);
        title.setTextSize(24);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        column.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Lists available for Shows & Movies get a toggle on the widget.");
        subtitle.setTextColor(COLOR_MUTED);
        subtitle.setTextSize(14);
        subtitle.setPadding(0, Math.round(6 * density), 0, Math.round(16 * density));
        column.addView(subtitle);

        String currentMedia = WidgetPrefs.getMedia(this, widgetId);
        String currentSection = WidgetPrefs.getSection(this, widgetId);
        boolean currentBoth = WidgetPrefs.isBothMedia(this, widgetId);

        for (String[] section : SECTIONS) {
            final String key = section[0];
            final String media = section[2];
            boolean both = media.equals("both");

            boolean selected = key.equals(currentSection)
                    && (both ? currentBoth : !currentBoth && media.equals(currentMedia));

            column.addView(buildRow(density, section[1], both ? "Shows & Movies" : media.equals("tv") ? "Shows" : "Movies",
                    selected, v -> select(key, media)));
        }

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(COLOR_BACKGROUND);
        scroll.setFillViewport(true);
        scroll.addView(column);

        // The activity draws edge to edge (enforced when targeting Android 15+), so pad
        // the content out of the status and navigation bars.
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                top = bars.top;
                bottom = bars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }

            column.setPadding(pad, pad + top, pad, pad + bottom);
            return insets;
        });

        return scroll;
    }

    private View buildRow(float density, String title, String mediaLabel, boolean selected,
            View.OnClickListener onClick) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(Math.round(16 * density), Math.round(14 * density), Math.round(16 * density),
                Math.round(14 * density));

        GradientDrawable background = new GradientDrawable();
        background.setColor(COLOR_CARD);
        background.setCornerRadius(16 * density);
        background.setStroke(Math.max(1, Math.round(density)), selected ? COLOR_ACCENT : COLOR_CARD_BORDER);
        row.setBackground(background);

        TextView name = new TextView(this);
        name.setText(title);
        name.setTextColor(selected ? COLOR_ACCENT : Color.WHITE);
        name.setTextSize(16);
        name.setTypeface(selected ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        name.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(name);

        TextView label = new TextView(this);
        label.setText(mediaLabel);
        label.setTextColor(COLOR_MUTED);
        label.setTextSize(13);
        row.addView(label);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.bottomMargin = Math.round(8 * density);
        row.setLayoutParams(params);

        row.setOnClickListener(onClick);

        return row;
    }

    private void select(String section, String media) {
        boolean both = media.equals("both");

        WidgetPrefs.setSection(this, widgetId, section, both);
        // A both-media list keeps whatever media the toggle was on; a single-media list
        // pins it.
        if (!both) WidgetPrefs.setMedia(this, widgetId, media);

        // The system skips the initial onUpdate when a configuration activity is set, so
        // trigger the first render (and data fetch) ourselves.
        WatchlistWidgetProvider.requestRefresh(this);

        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
        finish();
    }
}

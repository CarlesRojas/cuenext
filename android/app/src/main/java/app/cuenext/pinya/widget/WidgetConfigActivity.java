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
 * The widget's configuration screen: pick which of the app's lists the widget shows.
 * Grouped by the media each list exists for - the lists that work for both first, since
 * those are the ones that give the widget its Shows/Movies toggle, then the show-only and
 * movie-only lists, which pin the widget to that media and hide the toggle. Built
 * programmatically in the app's dark palette so no layout resources beyond the widget's
 * own are needed.
 */
public class WidgetConfigActivity extends Activity {
    // key, title. Lists that exist for Shows & Movies; picking one keeps the toggle.
    private static final String[][] BOTH_SECTIONS = {
            { "next", "Watch next" },
            { "finished", "Finished" },
            { "upcoming", "Upcoming" },
            { "trending", "Trending" },
            { "top", "Top rated" },
    };

    private static final String[][] TV_SECTIONS = {
            { "unstarted", "Haven't started" },
            { "waiting", "Waiting for episodes" },
            { "stopped", "Stopped watching" },
            { "discover-upcoming", "Dropping this week" },
    };

    private static final String[][] MOVIE_SECTIONS = {
            { "waiting", "Not released yet" },
            { "discover-upcoming", "Upcoming movies" },
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
        subtitle.setPadding(0, Math.round(6 * density), 0, 0);
        column.addView(subtitle);

        String currentMedia = WidgetPrefs.getMedia(this, widgetId);
        String currentSection = WidgetPrefs.getSection(this, widgetId);
        boolean currentBoth = WidgetPrefs.isBothMedia(this, widgetId);

        addGroup(column, density, "Shows & Movies", BOTH_SECTIONS, "both", currentMedia, currentSection, currentBoth);
        addGroup(column, density, "Shows", TV_SECTIONS, "tv", currentMedia, currentSection, currentBoth);
        addGroup(column, density, "Movies", MOVIE_SECTIONS, "movie", currentMedia, currentSection, currentBoth);

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

    private void addGroup(LinearLayout column, float density, String label, String[][] sections, final String media,
            String currentMedia, String currentSection, boolean currentBoth) {
        TextView header = new TextView(this);
        header.setText(label);
        header.setTextColor(COLOR_MUTED);
        header.setTextSize(13);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setAllCaps(true);
        header.setPadding(0, Math.round(20 * density), 0, Math.round(8 * density));
        column.addView(header);

        boolean both = media.equals("both");

        for (String[] section : sections) {
            final String key = section[0];
            boolean selected = key.equals(currentSection)
                    && (both ? currentBoth : !currentBoth && media.equals(currentMedia));

            column.addView(buildRow(density, section[1], selected, v -> select(key, media)));
        }
    }

    private View buildRow(float density, String title, boolean selected, View.OnClickListener onClick) {
        TextView row = new TextView(this);
        row.setText(title);
        row.setTextColor(selected ? COLOR_ACCENT : Color.WHITE);
        row.setTextSize(16);
        row.setTypeface(selected ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(Math.round(16 * density), Math.round(14 * density), Math.round(16 * density),
                Math.round(14 * density));

        GradientDrawable background = new GradientDrawable();
        background.setColor(COLOR_CARD);
        background.setCornerRadius(16 * density);
        background.setStroke(Math.max(1, Math.round(density)), selected ? COLOR_ACCENT : COLOR_CARD_BORDER);
        row.setBackground(background);

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

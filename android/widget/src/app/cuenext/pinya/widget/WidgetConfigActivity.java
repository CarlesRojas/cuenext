package app.cuenext.pinya.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * The widget's configuration screen: pick which of the app's horizontal lists the widget
 * shows. Every list the watchlist renders is offered, grouped by media type; the widget's
 * top-right toggle later switches between the Shows and Movies variant, remembering the
 * chosen list per media type. Built programmatically in the app's dark palette so no
 * layout resources beyond the widget's own are needed.
 */
public class WidgetConfigActivity extends Activity {
    private static final String[][] TV_SECTIONS = {
            { "next", "Watch next" },
            { "unstarted", "Haven't started" },
            { "waiting", "Waiting for episodes" },
            { "stopped", "Stopped watching" },
            { "finished", "Finished" },
    };

    private static final String[][] MOVIE_SECTIONS = {
            { "next", "Watch next" },
            { "waiting", "Not released yet" },
            { "finished", "Finished" },
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

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Choose a list");
        title.setTextColor(Color.WHITE);
        title.setTextSize(24);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        column.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("The widget shows this list, and its toggle switches between Shows and Movies.");
        subtitle.setTextColor(COLOR_MUTED);
        subtitle.setTextSize(14);
        subtitle.setPadding(0, Math.round(6 * density), 0, Math.round(12 * density));
        column.addView(subtitle);

        String currentMedia = WidgetPrefs.getMedia(this, widgetId);
        String currentSection = WidgetPrefs.getSection(this, widgetId, currentMedia);

        addGroup(column, density, "Shows", "tv", TV_SECTIONS, currentMedia, currentSection);
        addGroup(column, density, "Movies", "movie", MOVIE_SECTIONS, currentMedia, currentSection);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(COLOR_BACKGROUND);
        scroll.setFillViewport(true);
        scroll.addView(column);

        return scroll;
    }

    private void addGroup(LinearLayout column, float density, String label, final String media, String[][] sections,
            String currentMedia, String currentSection) {
        TextView header = new TextView(this);
        header.setText(label);
        header.setTextColor(COLOR_MUTED);
        header.setTextSize(13);
        header.setTypeface(Typeface.DEFAULT_BOLD);
        header.setAllCaps(true);
        header.setPadding(0, Math.round(16 * density), 0, Math.round(8 * density));
        column.addView(header);

        for (String[] section : sections) {
            final String key = section[0];
            boolean selected = media.equals(currentMedia) && key.equals(currentSection);

            TextView row = new TextView(this);
            row.setText(section[1]);
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

            row.setOnClickListener(v -> select(media, key));

            column.addView(row);
        }
    }

    private void select(String media, String section) {
        WidgetPrefs.setMedia(this, widgetId, media);
        WidgetPrefs.setSection(this, widgetId, media, section);

        // The system skips the initial onUpdate when a configuration activity is set, so
        // trigger the first render (and data fetch) ourselves.
        WatchlistWidgetProvider.requestRefresh(this);

        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
        finish();
    }
}

package app.cuenext.pinya.widget;

/**
 * One logcat tag for every widget code path, so a scroll session can be captured with
 * `adb logcat -v time -s CueNextWidget:D`. The interesting signals: how often the
 * launcher calls getViewAt and the poster provider's openFile while scrolling (each
 * openFile means the launcher is re-reading and re-decoding a poster), whether
 * onDataSetChanged or updateWidget fire during a scroll at all (they should not), and
 * whether factories get recreated mid-session.
 */
final class WidgetLog {
    static final String TAG = "CueNextWidget";

    private WidgetLog() {}
}

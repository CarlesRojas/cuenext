package app.cuenext.pinya.widget;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * All widget state: the pairing credentials handed over by the web app through the
 * cuenext://widget-setup deep link, the per-widget list choice, and the last sections
 * payload per media type so the widget can paint instantly (and offline) before a
 * network refresh lands.
 */
public final class WidgetPrefs {
    private static final String FILE = "cuenext_widget";

    private WidgetPrefs() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    // --- Pairing -----------------------------------------------------------------------

    public static void saveCredentials(Context context, String token, String apiBase) {
        prefs(context).edit()
                .putString("token", token)
                .putString("apiBase", apiBase)
                .putBoolean("tokenRejected", false)
                .apply();
    }

    public static String getToken(Context context) {
        return prefs(context).getString("token", null);
    }

    public static String getApiBase(Context context) {
        return prefs(context).getString("apiBase", null);
    }

    public static boolean isConnected(Context context) {
        return getToken(context) != null && getApiBase(context) != null;
    }

    /** Set when the backend answers 401, i.e. the token was revoked from the profile page. */
    public static void setTokenRejected(Context context, boolean rejected) {
        prefs(context).edit().putBoolean("tokenRejected", rejected).apply();
    }

    public static boolean isTokenRejected(Context context) {
        return prefs(context).getBoolean("tokenRejected", false);
    }

    // --- Per-widget configuration ------------------------------------------------------

    public static void setMedia(Context context, int widgetId, String media) {
        prefs(context).edit().putString("widget_" + widgetId + "_media", media).apply();
    }

    public static String getMedia(Context context, int widgetId) {
        return prefs(context).getString("widget_" + widgetId + "_media", "tv");
    }

    // The chosen list is remembered per media type, so toggling movie -> tv -> movie
    // brings back the same movie list.
    public static void setSection(Context context, int widgetId, String media, String section) {
        prefs(context).edit().putString("widget_" + widgetId + "_section_" + media, section).apply();
    }

    public static String getSection(Context context, int widgetId, String media) {
        return prefs(context).getString("widget_" + widgetId + "_section_" + media, "next");
    }

    public static void deleteWidget(Context context, int widgetId) {
        prefs(context).edit()
                .remove("widget_" + widgetId + "_media")
                .remove("widget_" + widgetId + "_section_tv")
                .remove("widget_" + widgetId + "_section_movie")
                .apply();
    }

    // --- Sections cache ----------------------------------------------------------------

    public static void setCachedSections(Context context, String media, String json) {
        prefs(context).edit()
                .putString("cache_" + media, json)
                .putLong("cache_" + media + "_at", System.currentTimeMillis())
                .apply();
    }

    public static String getCachedSections(Context context, String media) {
        return prefs(context).getString("cache_" + media, null);
    }

    public static long getCachedSectionsAge(Context context, String media) {
        long at = prefs(context).getLong("cache_" + media + "_at", 0);
        return at == 0 ? Long.MAX_VALUE : System.currentTimeMillis() - at;
    }

    /** Ages both payloads out so the grid factories refetch on their next poke. */
    public static void invalidateCache(Context context) {
        prefs(context).edit().remove("cache_tv_at").remove("cache_movie_at").apply();
    }
}

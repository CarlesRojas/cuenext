package app.cuenext.pinya.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Plain-framework networking for the widget (HttpURLConnection + org.json), so no
 * dependency has to be patched into the Bubblewrap-generated build.gradle. Also owns the
 * on-disk artwork cache; WidgetCardRenderer turns those files into the cards the grid
 * shows.
 */
public final class WidgetApi {
    private static final String POSTER_DIR = "widget_posters";

    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 8000;

    private WidgetApi() {}

    /** GET /widget/sections?media=tv|movie. Returns the JSON payload, or null on failure. */
    public static String fetchSections(Context context, String media) {
        String apiBase = WidgetPrefs.getApiBase(context);
        if (apiBase == null) return null;

        String token = WidgetPrefs.getToken(context);
        if (token == null) return null;

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(apiBase + "/widget/sections?media=" + media).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("Authorization", "Bearer " + token);

            int status = connection.getResponseCode();

            if (status == 401) {
                // The token was revoked from the profile page: remember it so the widget
                // can show its reconnect state, and drop the cached payloads so no
                // covers survive the revocation.
                WidgetPrefs.setTokenRejected(context, true);
                WidgetPrefs.clearCachedSections(context);
                return null;
            }

            if (status != 200) return null;

            WidgetPrefs.setTokenRejected(context, false);

            BufferedReader reader =
                    new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            reader.close();

            return body.toString();
        } catch (Exception e) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    // --- Posters -----------------------------------------------------------------------

    /**
     * Download the artwork of the given sections, so building cells only reads local
     * files. Limited to the sections some widget actually displays - the payload carries
     * every list of the app, and fetching all of them would be ~100 downloads. Other
     * sections fill in lazily if a widget is reconfigured to them.
     */
    public static void prefetchPosters(Context context, String sectionsJson, java.util.Set<String> sectionKeys) {
        try {
            JSONArray sections = new JSONObject(sectionsJson).getJSONArray("sections");
            for (int s = 0; s < sections.length(); s++) {
                JSONObject section = sections.getJSONObject(s);
                if (sectionKeys != null && !sectionKeys.contains(section.getString("key"))) continue;

                JSONArray items = section.getJSONArray("items");
                for (int i = 0; i < items.length(); i++) {
                    String url = items.getJSONObject(i).optString("posterUrl", "");
                    if (!url.isEmpty()) posterFile(context, url);
                }
            }
        } catch (Exception ignored) {
        }
    }

    /** The cached artwork file for a poster URL, downloading it on a miss. */
    static File posterFile(Context context, String url) {
        try {
            File dir = new File(context.getCacheDir(), POSTER_DIR);
            if (!dir.exists() && !dir.mkdirs()) return null;

            File file = new File(dir, sha1(url) + ".jpg");
            if (file.exists() && file.length() > 0) return file;

            Bitmap source = download(url);
            if (source == null) return null;

            boolean written = writeJpeg(file, source);
            source.recycle();

            return written ? file : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static Bitmap download(String url) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);

            if (connection.getResponseCode() != 200) return null;

            InputStream in = connection.getInputStream();
            Bitmap bitmap = BitmapFactory.decodeStream(in);
            in.close();
            return bitmap;
        } catch (Exception e) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static boolean writeJpeg(File file, Bitmap bitmap) {
        try {
            File temp = new File(file.getParentFile(), file.getName() + ".tmp");
            FileOutputStream out = new FileOutputStream(temp);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out);
            out.close();
            return temp.renameTo(file) || file.exists();
        } catch (Exception e) {
            return false;
        }
    }

    private static String sha1(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-1");
        byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}

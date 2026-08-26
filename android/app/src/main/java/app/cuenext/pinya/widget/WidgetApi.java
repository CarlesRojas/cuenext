package app.cuenext.pinya.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.net.Uri;

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
 * dependency has to be patched into the Bubblewrap-generated build.gradle.
 *
 * Posters are downloaded once and pre-rendered to disk as rounded 2:3 PNGs; cells then
 * reference them by content URI (served by WidgetPosterProvider) instead of carrying
 * bitmaps. That keeps each cell's RemoteViews tiny: the launcher caps a collection's
 * cached RemoteViews at ~2MB of bitmap memory, and parcelled bitmaps blow through it
 * after a couple of covers, which made scrolling re-fetch and re-inflate cells
 * constantly.
 */
public final class WidgetApi {
    public static final String POSTER_AUTHORITY = "app.cuenext.pinya.widgetposters";

    // The card's 2:3 shape with the app's 22/144 corner ratio. Rendered small on purpose:
    // the launcher re-decodes a cell's PNG synchronously on its UI thread every time it
    // recycles a row, so decode cost is what scroll smoothness is made of.
    private static final int POSTER_WIDTH_PX = 250;
    private static final int POSTER_HEIGHT_PX = 375;
    private static final float POSTER_RADIUS_PX = POSTER_WIDTH_PX * 22f / 144f;

    private static final String RENDERED_DIR = "widget_posters_rendered";
    private static final String PLACEHOLDER_NAME = "placeholder_" + POSTER_WIDTH_PX + ".png";

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
     * Render the posters of the given sections to disk, so building cells is URI lookups
     * only. Limited to the sections some widget actually displays - the payload carries
     * every list of the app, and pre-rendering all of them would be ~100 downloads.
     * Other sections fill in lazily if a widget is reconfigured to them.
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
                    if (!url.isEmpty()) renderedPosterFile(context, url);
                }
            }
        } catch (Exception ignored) {
        }
    }

    /** The content URI of a poster's rendered card, downloading and rendering on a miss. */
    public static Uri posterUri(Context context, String url) {
        if (url == null || url.isEmpty()) return null;

        File file = renderedPosterFile(context, url);
        return file == null ? null : uriFor(file.getName());
    }

    /** The content URI of the gray placeholder card (skeletons and imageless titles). */
    public static Uri placeholderUri(Context context) {
        try {
            File file = new File(renderedDir(context), PLACEHOLDER_NAME);

            if (!file.exists()) {
                Bitmap placeholder = renderPlaceholder();
                if (!writePng(file, placeholder)) return null;
                placeholder.recycle();
            }

            return uriFor(file.getName());
        } catch (Exception e) {
            return null;
        }
    }

    /** Resolves a served filename to its file, for WidgetPosterProvider. Null if invalid. */
    static File servedFile(Context context, String name) {
        if (name == null) return null;
        if (!name.equals(PLACEHOLDER_NAME) && !name.matches("[0-9a-f]{40}\\.png")) return null;

        File file = new File(renderedDir(context), name);
        return file.exists() ? file : null;
    }

    private static Uri uriFor(String name) {
        return Uri.parse("content://" + POSTER_AUTHORITY + "/" + name);
    }

    private static File renderedDir(Context context) {
        File dir = new File(context.getCacheDir(), RENDERED_DIR);
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private static File renderedPosterFile(Context context, String url) {
        try {
            // The render size is part of the name, so a size change invalidates old files.
            File file = new File(renderedDir(context),
                    sha1(WidgetPrefs.getPosterSalt(context) + url + "@" + POSTER_WIDTH_PX) + ".png");
            if (file.exists() && file.length() > 0) return file;

            Bitmap source = download(url);
            if (source == null) return null;

            Bitmap card = roundedCenterCrop(source, POSTER_WIDTH_PX, POSTER_HEIGHT_PX, POSTER_RADIUS_PX);
            source.recycle();

            boolean written = writePng(file, card);
            card.recycle();

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

    private static boolean writePng(File file, Bitmap bitmap) {
        try {
            File temp = new File(file.getParentFile(), file.getName() + ".tmp");
            FileOutputStream out = new FileOutputStream(temp);
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
            out.close();
            return temp.renameTo(file) || file.exists();
        } catch (Exception e) {
            return false;
        }
    }

    private static Bitmap roundedCenterCrop(Bitmap source, int width, int height, float radius) {
        Bitmap output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        float scale = Math.max((float) width / source.getWidth(), (float) height / source.getHeight());
        Matrix matrix = new Matrix();
        matrix.setScale(scale, scale);
        matrix.postTranslate((width - source.getWidth() * scale) / 2f, (height - source.getHeight() * scale) / 2f);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        BitmapShader shader = new BitmapShader(source, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
        shader.setLocalMatrix(matrix);
        paint.setShader(shader);

        canvas.drawRoundRect(new RectF(0, 0, width, height), radius, radius, paint);

        return output;
    }

    /** A rounded neutral-800 card, the base of skeleton cells and imageless titles. */
    private static Bitmap renderPlaceholder() {
        Bitmap output = Bitmap.createBitmap(POSTER_WIDTH_PX, POSTER_HEIGHT_PX, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(0xFF262626);
        canvas.drawRoundRect(new RectF(0, 0, POSTER_WIDTH_PX, POSTER_HEIGHT_PX), POSTER_RADIUS_PX,
                POSTER_RADIUS_PX, paint);

        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(2);
        paint.setColor(0x66737373);
        canvas.drawRoundRect(new RectF(1, 1, POSTER_WIDTH_PX - 1, POSTER_HEIGHT_PX - 1), POSTER_RADIUS_PX,
                POSTER_RADIUS_PX, paint);

        return output;
    }

    private static String sha1(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-1");
        byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}

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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Plain-framework networking for the widget (HttpURLConnection + org.json), so no
 * dependency has to be patched into the Bubblewrap-generated build.gradle. Talks to the
 * Convex HTTP endpoints in convex/http.ts using the paired widget token, and keeps a
 * small poster cache on disk so repaints don't re-download images.
 */
public final class WidgetApi {
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 8000;

    private WidgetApi() {}

    /** GET /widget/sections?media=tv|movie. Returns the JSON payload, or null on failure. */
    public static String fetchSections(Context context, String media) {
        String apiBase = WidgetPrefs.getApiBase(context);
        if (apiBase == null) return null;

        return request(context, apiBase + "/widget/sections?media=" + media, null);
    }

    /**
     * POST /widget/watch with the `watch` object the sections payload carried for the
     * item. The backend answers with the refreshed sections for that media type.
     */
    public static String postWatch(Context context, String watchJson) {
        String apiBase = WidgetPrefs.getApiBase(context);
        if (apiBase == null) return null;

        return request(context, apiBase + "/widget/watch", watchJson);
    }

    private static String request(Context context, String url, String postBody) {
        String token = WidgetPrefs.getToken(context);
        if (token == null) return null;

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("Authorization", "Bearer " + token);

            if (postBody != null) {
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
                OutputStream out = connection.getOutputStream();
                out.write(postBody.getBytes(StandardCharsets.UTF_8));
                out.close();
            }

            int status = connection.getResponseCode();

            if (status == 401) {
                // The token was revoked from the profile page: remember it so the widget
                // can tell the user to reconnect instead of silently showing stale data.
                WidgetPrefs.setTokenRejected(context, true);
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

    /** Download every poster of the payload into the disk cache, so rendering is I/O only. */
    public static void prefetchPosters(Context context, String sectionsJson) {
        try {
            JSONArray sections = new JSONObject(sectionsJson).getJSONArray("sections");
            for (int s = 0; s < sections.length(); s++) {
                JSONArray items = sections.getJSONObject(s).getJSONArray("items");
                for (int i = 0; i < items.length(); i++) {
                    String url = items.getJSONObject(i).optString("posterUrl", "");
                    if (!url.isEmpty()) posterFile(context, url);
                }
            }
        } catch (Exception ignored) {
        }
    }

    /**
     * The poster for a cell: read from the disk cache (downloading on a miss), scaled and
     * center-cropped to the cell, with the same rounded corners the app's cards have.
     * Returns null when the image can't be obtained, and the cell falls back to the title.
     */
    public static Bitmap loadPoster(Context context, String url, int widthPx, int heightPx, float radiusPx) {
        if (url == null || url.isEmpty()) return null;

        try {
            File file = posterFile(context, url);
            if (file == null) return null;

            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);

            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 1;
            while (bounds.outWidth / (options.inSampleSize * 2) >= widthPx) options.inSampleSize *= 2;

            Bitmap source = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
            if (source == null) return null;

            Bitmap rounded = roundedCenterCrop(source, widthPx, heightPx, radiusPx);
            if (rounded != source) source.recycle();
            return rounded;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * A rounded neutral-800 card for items without an image; the title TextView overlays
     * it. Also what gives such cells their 2:3 height, since the poster bitmap drives the
     * cell size.
     */
    public static Bitmap placeholder(int widthPx, int heightPx, float radiusPx) {
        Bitmap output = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(0xFF262626);
        canvas.drawRoundRect(new RectF(0, 0, widthPx, heightPx), radiusPx, radiusPx, paint);

        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(2);
        paint.setColor(0x66737373);
        canvas.drawRoundRect(new RectF(1, 1, widthPx - 1, heightPx - 1), radiusPx, radiusPx, paint);

        return output;
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

    /** The cached file for a poster URL, downloading it on a miss. Null when unavailable. */
    private static File posterFile(Context context, String url) {
        try {
            File dir = new File(context.getCacheDir(), "widget_posters");
            if (!dir.exists() && !dir.mkdirs()) return null;

            File file = new File(dir, sha1(url));
            if (file.exists() && file.length() > 0) return file;

            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);

            try {
                if (connection.getResponseCode() != 200) return null;

                InputStream in = connection.getInputStream();
                File temp = new File(dir, file.getName() + ".tmp");
                FileOutputStream out = new FileOutputStream(temp);
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
                out.close();
                in.close();

                if (!temp.renameTo(file)) return temp;
                return file;
            } finally {
                connection.disconnect();
            }
        } catch (Exception e) {
            return null;
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

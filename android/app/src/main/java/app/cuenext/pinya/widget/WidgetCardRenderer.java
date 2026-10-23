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
import android.text.TextPaint;
import android.util.LruCache;

import java.io.File;

/**
 * Draws a whole poster card into one bitmap: the artwork center-cropped, the app's
 * rounded corners, the watch-progress bar, or the title when a poster is missing.
 *
 * Everything is composited here so a grid cell can be a single ImageView. Widget cells
 * are inflated and bound by the launcher on its UI thread every time a row appears, and
 * each extra view in the cell layout costs inflation time - a ProgressBar especially -
 * so the cheapest possible cell is one view showing one ready-made image.
 *
 * Finished cards live in an LruCache keyed by artwork, size and state, which both keeps
 * repeated builds instant and holds a strong reference to every bitmap the launcher is
 * currently showing, so nothing is collected and reloaded mid-scroll.
 */
final class WidgetCardRenderer {
    // The app's card: 2:3 with a 22/144 corner ratio, neutral-800 with a neutral-500/40
    // border when there is no artwork, drawn on the widget's own background colour
    // because RGB_565 cards carry no transparency.
    private static final float CORNER_RATIO = 22f / 144f;
    private static final int COLOR_BACKGROUND = 0xFF0A0A0A;
    private static final int COLOR_CARD = 0xFF262626;
    private static final int COLOR_CARD_BORDER = 0x66737373;
    private static final int COLOR_TITLE = 0xFF737373;

    // Cards are drawn at the size they are displayed, so the launcher never scales them.
    // Enough room for a dozen cards of any widget size, and far below the per-widget
    // bitmap budget (roughly 6 bytes per screen pixel).
    private static final int CACHE_BYTES = 12 * 1024 * 1024;

    private static final LruCache<String, Bitmap> CACHE = new LruCache<String, Bitmap>(CACHE_BYTES) {
        @Override
        protected int sizeOf(String key, Bitmap value) {
            return value.getByteCount();
        }
    };

    private WidgetCardRenderer() {}

    /**
     * The card for one item, from the cache when possible. Returns null only when the
     * artwork is missing AND the title cannot be drawn, which cannot happen in practice.
     */
    static Bitmap card(Context context, String posterUrl, String title, int progress, int widthPx, int heightPx) {
        String key = widthPx + "x" + heightPx + "|" + progress + "|" + (posterUrl == null ? title : posterUrl);

        Bitmap cached = CACHE.get(key);
        if (cached != null && !cached.isRecycled()) return cached;

        boolean hasArtwork = posterUrl != null && !posterUrl.isEmpty()
                && WidgetApi.cachedPoster(context, posterUrl) != null;

        Bitmap card = draw(context, hasArtwork ? posterUrl : null, title, progress, widthPx, heightPx);

        // A card drawn while its artwork was still downloading shows the title fallback,
        // so it must not be cached under the artwork's key - the next render, once the
        // file has landed, has to draw the real cover.
        boolean expectingArtwork = posterUrl != null && !posterUrl.isEmpty() && !hasArtwork;
        if (card != null && !expectingArtwork) CACHE.put(key, card);

        return card;
    }

    /** The empty gray card behind skeleton cells. */
    static Bitmap placeholder(int widthPx, int heightPx) {
        return card(null, null, null, -1, widthPx, heightPx);
    }

    private static Bitmap draw(Context context, String posterUrl, String title, int progress, int widthPx,
            int heightPx) {
        if (widthPx <= 0 || heightPx <= 0) return null;

        // RGB_565 halves the memory of every card, and nothing here needs transparency:
        // the rounded corners are drawn over the widget's background colour.
        Bitmap output = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.RGB_565);
        // Cards are drawn at their exact display size, so the ImageView must not rescale
        // them for the screen's density.
        output.setDensity(Bitmap.DENSITY_NONE);

        Canvas canvas = new Canvas(output);
        canvas.drawColor(COLOR_BACKGROUND);

        float radius = widthPx * CORNER_RATIO;
        RectF bounds = new RectF(0, 0, widthPx, heightPx);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        Bitmap poster = context == null ? null : loadPoster(context, posterUrl, widthPx, heightPx);

        if (poster != null) {
            float scale = Math.max((float) widthPx / poster.getWidth(), (float) heightPx / poster.getHeight());
            Matrix matrix = new Matrix();
            matrix.setScale(scale, scale);
            matrix.postTranslate((widthPx - poster.getWidth() * scale) / 2f,
                    (heightPx - poster.getHeight() * scale) / 2f);

            BitmapShader shader = new BitmapShader(poster, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
            shader.setLocalMatrix(matrix);
            paint.setShader(shader);
            canvas.drawRoundRect(bounds, radius, radius, paint);
            paint.setShader(null);

            poster.recycle();
        } else {
            paint.setColor(COLOR_CARD);
            canvas.drawRoundRect(bounds, radius, radius, paint);

            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(1f, widthPx / 160f));
            paint.setColor(COLOR_CARD_BORDER);
            canvas.drawRoundRect(new RectF(1, 1, widthPx - 1, heightPx - 1), radius, radius, paint);
            paint.setStyle(Paint.Style.FILL);

            if (title != null && !title.isEmpty()) drawTitle(canvas, title, widthPx, heightPx);
        }

        if (progress >= 0) drawProgress(canvas, progress, widthPx, heightPx);

        return output;
    }

    // The app's PosterCard fallback: the title centred on the empty card.
    private static void drawTitle(Canvas canvas, String title, int widthPx, int heightPx) {
        TextPaint paint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(COLOR_TITLE);
        paint.setTextSize(widthPx / 9f);
        paint.setTextAlign(Paint.Align.CENTER);

        float maxWidth = widthPx * 0.8f;
        float lineHeight = paint.getTextSize() * 1.3f;

        // Word wrap by hand: StaticLayout would need a per-API-level constructor dance
        // for four lines of text.
        java.util.List<String> lines = new java.util.ArrayList<>();
        StringBuilder line = new StringBuilder();

        for (String word : title.split("\\s+")) {
            String candidate = line.length() == 0 ? word : line + " " + word;
            if (paint.measureText(candidate) <= maxWidth || line.length() == 0) {
                line.setLength(0);
                line.append(candidate);
            } else {
                lines.add(line.toString());
                line.setLength(0);
                line.append(word);
            }
            if (lines.size() == 4) break;
        }
        if (line.length() > 0 && lines.size() < 4) lines.add(line.toString());

        float y = heightPx / 2f - (lines.size() - 1) * lineHeight / 2f + paint.getTextSize() / 3f;
        for (String text : lines) {
            canvas.drawText(text, widthPx / 2f, y, paint);
            y += lineHeight;
        }
    }

    // The card's watch-progress bar: white on white/30, fully rounded, inset like the app.
    private static void drawProgress(Canvas canvas, int progress, int widthPx, int heightPx) {
        float inset = widthPx * 0.07f;
        float height = Math.max(2f, widthPx / 28f);
        float radius = height / 2f;
        float top = heightPx - inset - height;
        float right = widthPx - inset;

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        paint.setColor(0x4DFFFFFF);
        canvas.drawRoundRect(new RectF(inset, top, right, top + height), radius, radius, paint);

        float filled = inset + (right - inset) * Math.min(100, Math.max(0, progress)) / 100f;
        paint.setColor(0xFFFFFFFF);
        canvas.drawRoundRect(new RectF(inset, top, Math.max(filled, inset + height), top + height), radius, radius,
                paint);
    }

    /** Decodes the downloaded artwork, subsampled to roughly the size it is drawn at. */
    private static Bitmap loadPoster(Context context, String posterUrl, int widthPx, int heightPx) {
        if (posterUrl == null || posterUrl.isEmpty()) return null;

        File file = WidgetApi.cachedPoster(context, posterUrl);
        if (file == null) return null;

        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);

            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 1;
            while (bounds.outWidth / (options.inSampleSize * 2) >= widthPx
                    && bounds.outHeight / (options.inSampleSize * 2) >= heightPx)
                options.inSampleSize *= 2;

            return BitmapFactory.decodeFile(file.getAbsolutePath(), options);
        } catch (Exception e) {
            return null;
        }
    }
}

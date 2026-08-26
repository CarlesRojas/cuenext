package app.cuenext.pinya.widget;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Read-only provider serving the pre-rendered poster PNGs to the launcher, so the
 * widget's grid cells can reference images by URI instead of parcelling bitmaps (see
 * WidgetApi). Exported because the launcher loads the URIs with no permission-grant
 * mechanism available to collection RemoteViews; it only ever serves rounded public
 * TMDB artwork from its own cache directory, under salted unguessable names.
 */
public class WidgetPosterProvider extends ContentProvider {

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new FileNotFoundException("read-only");

        File file = WidgetApi.servedFile(getContext(), uri.getLastPathSegment());
        if (file == null) throw new FileNotFoundException(uri.toString());

        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) {
        return "image/png";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}

/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package app.cuenext.pinya;

import android.content.pm.ActivityInfo;
import android.content.pm.ShortcutManager;
import android.os.Build;
import android.os.Bundle;

import java.util.Collections;

import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

import com.google.androidbrowserhelper.trusted.LauncherActivityMetadata;
import com.google.androidbrowserhelper.trusted.ManageDataLauncherActivity;
import com.google.androidbrowserhelper.trusted.SessionStore;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import com.google.androidbrowserhelper.trusted.splashscreens.SplashScreenStrategy;

// Master copy. `bubblewrap update` regenerates app/ from its template, so apply-assets.sh copies
// this file over the generated LauncherActivity on every release. Edit it here, not in app/.
public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected void launchTwa() {
        super.launchTwa();
        // The library adds a "Site settings" shortcut on every launch, which shows first in the
        // launcher's long-press menu. Remove it right after. Turning off enableSiteSettingsShortcut
        // in twa-manifest.json instead drops ManageDataLauncherActivity from the manifest, which
        // the library still tries to enable on launch.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            ShortcutManager shortcutManager = getSystemService(ShortcutManager.class);
            if (shortcutManager != null) {
                shortcutManager.removeDynamicShortcuts(
                        Collections.singletonList(ManageDataLauncherActivity.SITE_SETTINGS_SHORTCUT_ID));
            }
        }
    }

    @Override
    protected TwaLauncher createTwaLauncher() {
        // Same launcher the parent builds, but always asking Chrome for its dark scheme. The
        // library hardcodes COLOR_SCHEME_SYSTEM, so with the phone in light mode Chrome paints its
        // own light surfaces (a white screen after the splash, a white navigation bar) no matter
        // which colors the manifest sets. The app has no light theme, so it is always dark.
        return new TwaLauncher(this, LauncherActivityMetadata.parse(this).launchingBrowser,
                SessionStore.makeSessionId(getTaskId()),
                new SharedPreferencesTokenStore(this)) {
            @Override
            public void launch(TrustedWebActivityIntentBuilder twaBuilder,
                    CustomTabsCallback customTabsCallback,
                    @Nullable SplashScreenStrategy splashScreenStrategy,
                    @Nullable Runnable completionCallback,
                    FallbackStrategy fallbackStrategy) {
                twaBuilder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK);
                super.launch(twaBuilder, customTabsCallback, splashScreenStrategy,
                        completionCallback, fallbackStrategy);
            }
        };
    }
}

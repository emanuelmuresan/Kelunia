package com.kelunia.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
        configureWebViewStorage();
    }

    private void configureSystemBars() {
        Window window = getWindow();

        window.setStatusBarColor(Color.WHITE);
        window.setNavigationBarColor(Color.WHITE);

        int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }

        window.getDecorView().setSystemUiVisibility(flags);
    }

    private void configureWebViewStorage() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
        }
    }
}

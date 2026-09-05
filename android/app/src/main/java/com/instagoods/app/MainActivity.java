package com.instagoods.app;

import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public void onPermissionRequest(final PermissionRequest request) {
        // Grant microphone (and any other requested) permissions to the WebView
        request.grant(request.getResources());
    }
}

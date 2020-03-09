package com.walmartlabs.ern.container.devassist;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.util.Log;
import com.google.zxing.Result;
import com.walmartlabs.ern.container.ElectrodeReactContainer;
import com.walmartlabs.ern.container.R;

import me.dm7.barcodescanner.zxing.ZXingScannerView;

public class BundleStoreScannerActivity extends Activity implements ZXingScannerView.ResultHandler {
    private ZXingScannerView mScannerView;
    protected SharedPreferences mPreferences;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        mPreferences = PreferenceManager.getDefaultSharedPreferences(this);
        mScannerView = new ZXingScannerView(this);   // Programmatically initialize the scanner view
        setContentView(mScannerView);                // Set the scanner view as the content view
    }

    @Override
    public void onResume() {
        super.onResume();
        mScannerView.setResultHandler(this); // Register ourselves as a handler for scan results.
        mScannerView.startCamera();          // Start camera on resume
    }

    @Override
    public void onPause() {
        super.onPause();
        mScannerView.stopCamera();           // Stop camera on pause
    }

    @Override
    public void handleResult(Result rawResult) {
        mPreferences.edit().putString(
                getString(R.string.debug_http_host),
                String.format(
                        "%s/bundles/%s/android/%s", "10.74.57.21:8080", "qr", rawResult.getText())).commit();
        ElectrodeReactContainer
                .getReactInstanceManager().getDevSupportManager().handleReloadJS();
        finish();
    }
}

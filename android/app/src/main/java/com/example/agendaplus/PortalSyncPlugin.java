package com.example.agendaplus;

import android.app.Dialog;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.CookieManager;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.widget.LinearLayout;
import android.widget.Button;
import android.view.ViewGroup;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONTokener;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "PortalSync")
public class PortalSyncPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url", "https://navigate.nu.edu/d2l/home");
        Uri origin = Uri.parse(url);
        if (!"https".equals(origin.getScheme()) || origin.getHost() == null) {
            call.reject("A secure school portal URL is required");
            return;
        }
        getActivity().runOnUiThread(() -> {
            Dialog dialog = new Dialog(getActivity());
            LinearLayout layout = new LinearLayout(getActivity());
            layout.setOrientation(LinearLayout.VERTICAL);
            WebView web = new WebView(getActivity());
            web.getSettings().setJavaScriptEnabled(true);
            web.getSettings().setDomStorageEnabled(true);
            web.getSettings().setAllowFileAccess(false);
            web.getSettings().setAllowContentAccess(false);
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
            boolean automatic = Boolean.TRUE.equals(call.getBoolean("automatic", false));
            Handler handler = new Handler(Looper.getMainLooper());
            web.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return !"https".equals(request.getUrl().getScheme());
                }
            });
            AtomicBoolean finished = new AtomicBoolean(false);
            Button sync = new Button(getActivity());
            sync.setText("Import coursework from this page");
            sync.setOnClickListener(v -> {
                Uri current = Uri.parse(web.getUrl() == null ? "" : web.getUrl());
                if (!"https".equals(current.getScheme()) || !origin.getHost().equalsIgnoreCase(current.getHost())) {
                    sync.setText("Finish signing in first");
                    return;
                }
                web.evaluateJavascript("(function(){return document.body ? document.body.innerText : '';})()", value -> {
                    if (finished.get()) return;
                    try {
                        Object decoded = new JSONTokener(value).nextValue();
                        if (!(decoded instanceof String) || ((String)decoded).trim().isEmpty()) {
                            sync.setText("Open coursework and retry");
                            return;
                        }
                        JSObject result = new JSObject();
                        result.put("text", decoded);
                        CookieManager.getInstance().flush();
                        finished.set(true);
                        call.resolve(result);
                        dialog.dismiss();
                    } catch (Exception e) {
                        sync.setText("Import failed — retry");
                    }
                });
            });
            layout.addView(sync);
            layout.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
            dialog.setContentView(layout);
            dialog.setOnDismissListener(d -> {
                handler.removeCallbacksAndMessages(null);
                CookieManager.getInstance().flush();
                web.stopLoading();
                layout.removeView(web);
                web.destroy();
                if (finished.compareAndSet(false, true)) call.reject("Portal closed");
            });
            dialog.show();
            if (dialog.getWindow() != null) dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            web.loadUrl(url);
            if (automatic) {
                handler.postDelayed(new Runnable() {
                    @Override public void run() {
                        if (finished.get()) return;
                        Uri current = Uri.parse(web.getUrl() == null ? "" : web.getUrl());
                        String path = current.getPath() == null ? "" : current.getPath();
                        if (origin.getHost().equalsIgnoreCase(current.getHost()) && "https".equals(current.getScheme())) {
                            if (path.matches("/d2l/home/?")) {
                                web.loadUrl("https://" + origin.getAuthority() + "/d2l/le/calendar/0");
                            } else if (path.startsWith("/d2l/le/calendar/")) {
                                web.evaluateJavascript("(function(){return document.body ? document.body.innerText : '';})()", value -> {
                                    if (finished.get()) return;
                                    try {
                                        Object decoded = new JSONTokener(value).nextValue();
                                        if (decoded instanceof String && ((String) decoded).matches("(?is).*(due|assignment|quiz|exam|discussion).*")) {
                                            sync.performClick();
                                        }
                                    } catch (Exception ignored) {}
                                });
                            }
                        }
                        if (!finished.get()) handler.postDelayed(this, 4000);
                    }
                }, 4000);
            }
        });
    }
}

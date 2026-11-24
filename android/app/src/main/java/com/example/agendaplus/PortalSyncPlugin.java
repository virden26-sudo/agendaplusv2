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
            sync.setText("Retry coursework scan");
            sync.setOnClickListener(v -> {
                Uri current = Uri.parse(web.getUrl() == null ? "" : web.getUrl());
                if (!"https".equals(current.getScheme()) || !origin.getHost().equalsIgnoreCase(current.getHost())) {
                    sync.setText("Finish signing in first");
                    return;
                }
                web.evaluateJavascript("(function(){const groups={assignments:[],quizzes:[],discussions:[]};const seen=new Set();function scan(root){for(const a of root.querySelectorAll('*')){if(a.shadowRoot)scan(a.shadowRoot);if(!a.matches('a, [role=link]'))continue;const task=(a.innerText||a.textContent||a.getAttribute('aria-label')||'').trim();if(!task||task.length>180||/^(assignments?|quizzes|discussions?|calendar|grades)$/i.test(task))continue;const row=a.closest('tr,li,[role=row],d2l-calendar-event')||a.parentElement;const details=(row.innerText||row.textContent||'').trim();const date=details.match(/(?:due\\s*(?:date)?[: ]*)?((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:,?\\s+20\\d{2})?|20\\d{2}-\\d{2}-\\d{2})/i);const kind=/quiz|exam/i.test(task)?'quizzes':/discussion/i.test(task)?'discussions':/assignment|homework|project/i.test(task)?'assignments':null;if(!kind||!date||seen.has(task))continue;seen.add(task);const course=(details.match(/\\b[A-Z]{2,5}\\s*\\d{3}\\b/)||[])[0]||'Course';groups[kind].push({task,dueDate:date[1],course,details});}}scan(document);return Object.entries(groups).filter(e=>e[1].length).map(e=>'=== STRUCTURED: '+e[0]+' ===\\n'+JSON.stringify({items:e[1]})).join('\\n');})()", value -> {
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
                                web.evaluateJavascript("(function(){const groups={assignments:[],quizzes:[],discussions:[]};const seen=new Set();function scan(root){for(const a of root.querySelectorAll('*')){if(a.shadowRoot)scan(a.shadowRoot);if(!a.matches('a, [role=link]'))continue;const task=(a.innerText||a.textContent||a.getAttribute('aria-label')||'').trim();if(!task||task.length>180||/^(assignments?|quizzes|discussions?|calendar|grades)$/i.test(task))continue;const row=a.closest('tr,li,[role=row],d2l-calendar-event')||a.parentElement;const details=(row.innerText||row.textContent||'').trim();const date=details.match(/(?:due\\s*(?:date)?[: ]*)?((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:,?\\s+20\\d{2})?|20\\d{2}-\\d{2}-\\d{2})/i);const kind=/quiz|exam/i.test(task)?'quizzes':/discussion/i.test(task)?'discussions':/assignment|homework|project/i.test(task)?'assignments':null;if(!kind||!date||seen.has(task))continue;seen.add(task);const course=(details.match(/\\b[A-Z]{2,5}\\s*\\d{3}\\b/)||[])[0]||'Course';groups[kind].push({task,dueDate:date[1],course,details});}}scan(document);return Object.entries(groups).filter(e=>e[1].length).map(e=>'=== STRUCTURED: '+e[0]+' ===\\n'+JSON.stringify({items:e[1]})).join('\\n');})()", value -> {
                                    if (finished.get()) return;
                                    try {
                                        Object decoded = new JSONTokener(value).nextValue();
                                        if (decoded instanceof String && ((String) decoded).contains("=== STRUCTURED:")) {
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

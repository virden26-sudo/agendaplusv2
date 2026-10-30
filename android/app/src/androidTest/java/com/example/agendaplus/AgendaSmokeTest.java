package com.example.agendaplus;

import android.app.Instrumentation;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Exercises the installed APK's real WebView, not just the Android package name. */
@RunWith(AndroidJUnit4.class)
public class AgendaSmokeTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();

    private MainActivity launch() {
        Intent intent = new Intent(instrumentation.getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return (MainActivity) instrumentation.startActivitySync(intent);
    }

    private String evaluate(MainActivity activity, String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        instrumentation.runOnMainSync(() -> activity.getBridge().getWebView().evaluateJavascript(script, result -> {
            value.set(result);
            done.countDown();
        }));
        assertTrue("WebView JavaScript callback timed out", done.await(5, TimeUnit.SECONDS));
        return value.get();
    }

    private void waitForApp(MainActivity activity) throws Exception {
        long deadline = System.currentTimeMillis() + 45000;
        while (System.currentTimeMillis() < deadline) {
            if ("true".equals(evaluate(activity, "document.title.includes('Agenda+') && document.body.innerText.length > 50"))) return;
            Thread.sleep(250);
        }
        fail("The installed APK did not render Agenda+");
    }

    @Test public void bundledFrontendRendersAndStorageSurvivesRelaunch() throws Exception {
        MainActivity activity = launch();
        try {
            waitForApp(activity);
            assertEquals("true", evaluate(activity, "localStorage.setItem('agenda-native-smoke', 'persisted'); localStorage.getItem('agenda-native-smoke') === 'persisted'"));
            MainActivity first = activity;
            instrumentation.runOnMainSync(first::finish);
            instrumentation.waitForIdleSync();
            activity = launch();
            waitForApp(activity);
            assertEquals("\"persisted\"", evaluate(activity, "localStorage.getItem('agenda-native-smoke')"));
            evaluate(activity, "localStorage.removeItem('agenda-native-smoke')");
        } finally {
            MainActivity last = activity;
            instrumentation.runOnMainSync(last::finish);
        }
    }
}

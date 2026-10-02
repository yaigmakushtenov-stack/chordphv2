package com.chordph.app;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "ScreenWakeLock")
public class ScreenWakeLockPlugin extends Plugin {
    private final Set<String> locks = new HashSet<>();

    @PluginMethod
    public void acquire(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty() || id.length() > 100) {
            call.reject("Invalid screen wake lock ID.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            locks.add(id);
            getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @PluginMethod
    public void release(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty() || id.length() > 100) {
            call.reject("Invalid screen wake lock ID.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            locks.remove(id);
            if (locks.isEmpty()) {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(() -> {
            locks.clear();
            getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }
}

package com.betrollover.app;

import android.content.Context;
import android.util.AttributeSet;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.webkit.WebView;

public final class CustomWebView extends WebView {

    private GestureDetector gestureDetector;

    /**
     * @param context
     */
    public CustomWebView(Context context) {
        super(context);
    }

    /**
     * @param context
     * @param attrs
     */
    public CustomWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    /**
     * @param context
     * @param attrs
     * @param defStyle
     */
    public CustomWebView(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
    }

    /*
     * @see android.webkit.WebView#onScrollChanged(int, int, int, int)
     */
    @Override
    protected void onScrollChanged(int l, int t, int oldl, int oldt) {
        if (Config.LOCK_WEBVIEW_HORIZONTAL_SCROLL && l != 0) {
            scrollTo(0, t);
            l = 0;
            oldl = 0;
        }
        super.onScrollChanged(l, t, oldl, oldt);
    }

    @Override
    protected void onOverScrolled(int scrollX, int scrollY, boolean clampedX, boolean clampedY) {
        if (Config.LOCK_WEBVIEW_HORIZONTAL_SCROLL) {
            super.onOverScrolled(0, scrollY, false, clampedY);
        } else {
            super.onOverScrolled(scrollX, scrollY, clampedX, clampedY);
        }
    }

    /*
     * @see android.webkit.WebView#onTouchEvent(android.view.MotionEvent)
     */
    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        return gestureDetector.onTouchEvent(ev) || super.onTouchEvent(ev);
    }

    public void setGestureDetector(GestureDetector gestureDetector) {
        this.gestureDetector = gestureDetector;
    }
}
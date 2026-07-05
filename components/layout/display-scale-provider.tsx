"use client";

import { useEffect } from "react";

/**
 * DISABLED: this used to drive CSS `zoom` on <html> from the user's
 * display-scale preference. CSS `zoom` breaks Radix's fixed-positioned popovers
 * (dropdowns/menus/tooltips get offset by a growing diagonal gap), so it's gone.
 * This now only clears any leftover `zoom` a previous build may have set, so the
 * UI renders at true 1:1 size and popovers anchor correctly. Use browser zoom
 * (Ctrl +/-) to resize — that doesn't affect element positioning.
 */
export function DisplayScaleProvider() {
  useEffect(() => {
    document.documentElement.style.zoom = "";
  }, []);

  return null;
}

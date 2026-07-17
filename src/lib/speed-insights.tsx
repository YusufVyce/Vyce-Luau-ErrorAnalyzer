import { useEffect } from "react";

// Safe wrapper that attempts a dynamic import of the Vercel Speed Insights
// integration. This avoids static-importing Next-specific module code which
// could break non-Next apps. The wrapper is a no-op if the package or the
// exported symbol is not available.
export function SpeedInsightsWrapper(): null {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("@vercel/speed-insights/next");
        // Some Speed Insights exports are components or initializers; try
        // to call any exported initializer function named `SpeedInsights`.
        const maybe = (mod as any).SpeedInsights;
        if (mounted && typeof maybe === "function") {
          try {
            // Call without args — the package will no-op if not compatible.
            maybe();
          } catch (e) {
            // swallow errors to avoid breaking the app
            // eslint-disable-next-line no-console
            console.debug("SpeedInsights initializer failed:", e);
          }
        }
      } catch (e) {
        // dynamic import failed — do nothing
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return null;
}

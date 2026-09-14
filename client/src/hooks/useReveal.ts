import { useEffect } from "react";

/**
 * Scroll-reveal: adds `.in` to `.reveal` elements when they enter
 * the viewport. Gated behind `body.reveal-on` so content stays
 * visible when JS or IntersectionObserver is unavailable.
 */
export function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    document.body.classList.add("reveal-on");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    const els = Array.from(document.querySelectorAll(".reveal:not(.in)"));
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

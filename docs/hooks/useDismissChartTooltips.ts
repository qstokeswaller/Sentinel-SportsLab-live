import { useEffect } from 'react';

/**
 * Dismiss stuck Recharts tooltips on touch devices.
 *
 * Recharts shows a tooltip when a chart is tapped, but on touch there is no
 * "mouse leave" event — so the tooltip stays frozen over the graph until the
 * user taps the chart again. On a phone-viewed public dossier that means the
 * ACWR / tonnage tooltip covers the middle of the chart and blocks navigation
 * (exactly the demo feedback).
 *
 * Fix: when the user touches (or clicks) anywhere OUTSIDE a chart, tell every
 * chart on the page to reset its tooltip. Recharts binds its reset to the
 * wrapper's React onMouseLeave, which React synthesises from a bubbling
 * `mouseout` whose relatedTarget lies outside the element — so we dispatch
 * exactly that. Touching inside a chart is left alone so normal interaction
 * still works.
 */
export function useDismissChartTooltips() {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const dismiss = (e: Event) => {
            const target = e.target as HTMLElement | null;
            // Touched/clicked inside a chart — leave its tooltip interaction intact.
            if (target && target.closest && target.closest('.recharts-wrapper')) return;

            document.querySelectorAll('.recharts-wrapper').forEach((el) => {
                // Bubbling mouseout with relatedTarget outside the wrapper makes
                // React fire the wrapper's onMouseLeave → Recharts hides the tooltip.
                el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
                el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
            });
        };

        document.addEventListener('touchstart', dismiss, { passive: true });
        document.addEventListener('mousedown', dismiss);
        return () => {
            document.removeEventListener('touchstart', dismiss);
            document.removeEventListener('mousedown', dismiss);
        };
    }, []);
}

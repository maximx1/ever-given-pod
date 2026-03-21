import { useState, useEffect } from 'react';

export function useFooterHeight() {
    const [visibleFooterHeight, setVisibleFooterHeight] = useState(0);

    useEffect(() => {
        const recalc = () => {
            const footer = document.querySelector('footer');
            if (!footer) {
                setVisibleFooterHeight(0);
                return;
            }

            const footerRect = footer.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const visibleHeight = Math.max(0, viewportHeight - footerRect.top);
            setVisibleFooterHeight(visibleHeight);
        };

        window.addEventListener('scroll', recalc, { passive: true });
        window.addEventListener('resize', recalc);
        recalc();

        return () => {
            window.removeEventListener('scroll', recalc);
            window.removeEventListener('resize', recalc);
        };
    }, []);

    return visibleFooterHeight;
}

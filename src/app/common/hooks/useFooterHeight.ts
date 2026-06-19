import { useState, useEffect } from 'react';
import { usePlayer } from '@/app/common/context/PlayerContext';

export function useFooterHeight() {
    const [visibleFooterHeight, setVisibleFooterHeight] = useState(0);
    const { queue } = usePlayer();
    const playerBarHeight = queue.length > 0 ? 72 : 0;

    useEffect(() => {
        const recalc = () => {
            // If the player is present, we hide the footer visually and treat
            // the footer height as zero so callers don't reserve space for it.
            if (queue.length > 0) {
                setVisibleFooterHeight(0);
                return;
            }
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
    }, [queue]);

    return visibleFooterHeight + playerBarHeight;
}

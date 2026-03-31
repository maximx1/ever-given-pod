import ArrowUpSvg from '@/icons/arrow-up.svg';
import ArrowDownSvg from '@/icons/arrow-down.svg';

type ArrowIconProps = {
    direction: 'up' | 'down';
    size?: number;
    className?: string;
};

export default function ArrowIcon({ direction, size = 24, className }: ArrowIconProps) {
    const Svg = direction === 'up' ? ArrowUpSvg : ArrowDownSvg;
    return <Svg width={size} height={size} className={className} />;
}

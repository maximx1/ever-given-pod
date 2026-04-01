import ArrowUpSvg from '@/icons/arrow-up.svg';
import ArrowDownSvg from '@/icons/arrow-down.svg';

type ArrowIconProps = {
    direction: 'up' | 'down';
    size?: number;
    className?: string;
};

export default function ArrowIcon({ direction, size = 24, className }: ArrowIconProps) {
    const Svg = direction === 'up' ? ArrowUpSvg : ArrowDownSvg;
    return (
        <span className={`inline-block ${className ?? ''}`} style={{ width: size, height: size }}>
            <Svg className="w-full h-full" />
        </span>
    );
}

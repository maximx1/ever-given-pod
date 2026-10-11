import SvgGear from '@/icons/gear.svg';

type GearIconProps = {
    size?: number;
    className?: string;
};

export default function GearIcon({ size = 20, className = '' }: GearIconProps) {
    return (
        <span className={`inline-block ${className}`} style={{ width: size, height: size }}>
            <SvgGear className="w-full h-full" style={{ transform: 'translate(-1px, -1px)', transformOrigin: 'center' }} />
        </span>
    );
}

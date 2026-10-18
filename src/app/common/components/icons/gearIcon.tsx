import GearSvg from '@/icons/gear.svg';

type GearIconProps = {
    size?: number;
    className?: string;
};

export default function GearIcon({ size = 24, className }: GearIconProps) {
    return (
        <span className={`inline-block ${className ?? ''}`} style={{ width: size, height: size }}>
            <GearSvg className="w-full h-full" />
        </span>
    );
}

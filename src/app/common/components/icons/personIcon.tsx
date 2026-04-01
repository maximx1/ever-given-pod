import PersonSvg from '@/icons/person.svg';

type PersonIconProps = {
    size?: number;
    className?: string;
};

export default function PersonIcon({ size = 24, className }: PersonIconProps) {
    return (
        <span className={`inline-block ${className ?? ''}`} style={{ width: size, height: size }}>
            <PersonSvg className="w-full h-full" />
        </span>
    );
}

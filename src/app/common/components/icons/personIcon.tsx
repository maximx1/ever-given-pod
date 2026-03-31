import PersonSvg from '@/icons/person.svg';

type PersonIconProps = {
    size?: number;
    className?: string;
};

export default function PersonIcon({ size = 24, className }: PersonIconProps) {
    return <PersonSvg width={size} height={size} className={className} />;
}

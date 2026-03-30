type CharCountProps = {
    current: number;
    max: number;
    threshold?: number;
};

export default function CharCount({ current, max, threshold = 0.95 }: CharCountProps) {
    if (current < max * threshold) return null;

    const remaining = max - current;
    const isOver = remaining <= 0;

    return (
        <span className={`text-xs ${isOver ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {current}/{max}
        </span>
    );
}

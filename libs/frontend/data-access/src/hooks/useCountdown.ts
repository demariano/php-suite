import { useEffect, useRef, useState } from 'react';

export const useCountdown = () => {
    const [countdown, setCountdown] = useState<number>(60);
    const [isCounting, setIsCounting] = useState<boolean>(false);
    const timeRef = useRef(null);

    useEffect(() => {
        if (isCounting) {
            if (countdown > 0) {
                timeRef.current = setTimeout(() => setCountdown(countdown - 1), 1000) as unknown as null;
            } else {
                setIsCounting(false);
                setCountdown(60);
            }
        }
    }, [countdown, isCounting]);

    const formattedTime = () => {
        const min = Math.floor(countdown / 60);
        const sec = countdown % 60;
        const minutes = String(min).padStart(2, '0');
        const seconds = String(sec).padStart(2, '0');

        return `${minutes}:${seconds}`;
    };

    const enableCounting = (isEnabled: boolean) => setIsCounting(isEnabled);

    return { countdown: formattedTime(), enableCounting, isCounting };
};

import { useState } from "react";

export const useIsProcessing = (enabled?: boolean) => {
    const [isProcessing, setIsProcessing] = useState(enabled);

    return {
        isProcessing,
        setIsProcessing
    }
}
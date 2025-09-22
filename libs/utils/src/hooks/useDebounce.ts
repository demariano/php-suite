/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-this-alias */

const useDebounce = (func: (value: never) => void, duration = 500) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return function (...args: never) {
        // @ts-ignore
        const context = this;

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            func.apply(context, args);
        }, duration);
    };
};

export default useDebounce;

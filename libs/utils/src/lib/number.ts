export const roundNumber = (num: number, decimal_digit: number) => {
    const powerOften = Math.pow(10, decimal_digit);

    return Math.round(num * powerOften) / powerOften;
};

export const convertToPercentage = (num: number, total: number) => {
    return Math.round((num / total) * 100);
};

export const chartInterval = (dataLength: number, maxLength: number) => {
    if (dataLength < maxLength) return 0;

    if (dataLength < maxLength * 2) return 2;

    return Math.floor(dataLength / maxLength);
};

export const isNegative = (num: number) => {
    if (Math.sign(num) === -1) {
        return true;
    }

    return false;
};

export const numberWithCommas = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

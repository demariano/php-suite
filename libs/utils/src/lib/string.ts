export const capitalize = (str: string): string => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export const maskedEmail = (email: string): string => {
    return email.replace(/^(.)(.*)(.@.)(.*)(\..*)$/, '$1**$3***');
};

export const initials = (str: string): string => {
    if (!str) return '';

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return str.match(/(^\S\S?|\b\S)?/g).join('').match(/(^\S|\S$)?/g).join('').toUpperCase();
};

/**
 * Serialize javascript object for sending to api
 * @param {Object} data
 * @returns {String}
 */
export function serializeQueryParams(data: { [key: string]: number | string }): string {
    return Object.keys(data).map((keyName: string) => {
        return `${encodeURIComponent(keyName)}=${data[keyName] ? encodeURIComponent(data[keyName]) : ''}`;
    }).join('&');
}

export const numberWithCommas = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

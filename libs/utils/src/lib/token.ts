export const isTokenInvalid = (token: string) => {
    const decoded = JSON.parse(atob(token.split('.')[1]));

    return decoded.exp * 1000 < Date.now();
};
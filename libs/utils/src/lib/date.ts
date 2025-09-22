export const formatDate = (date: Date | string) => {
    const dateFormat = new Date(date);

    return `${dateFormat.getMonth() + 1}/${dateFormat.getDate()}/${dateFormat.getFullYear().toString().substr(-2)}`;
};
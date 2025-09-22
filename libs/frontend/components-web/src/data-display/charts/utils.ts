import colors from '@ui-config/colors';

type SortableObject = { value: string, sort: number };

const generateColorVariants = () => {
    const keys = Object.keys(colors);

    return keys.reduce((curr: SortableObject[], key) => {
        const split = key.match(/([a-zA-Z]+)-(\d+)/) || [];

        if (parseInt(split[2]) <= 600 && parseInt(split[2]) > 50) {
            curr.push({
                value: key,
                sort: Math.floor((Math.random() * 100) + 1)
            });
        }

        return curr;
    }, []).sort((a: SortableObject, b: SortableObject) => {
        return a.sort - b.sort;
        // const fa = a.sort.toLowerCase();
        // const fb = b.sort.toLowerCase();

        // if (fa > fb) {
        //     return -1;
        // }

        // if (fa < fb) {
        //     return 1;
        // }

        // return 0;
    }).map(v => v.value);
};

export const COLOR_VARIANTS = generateColorVariants();
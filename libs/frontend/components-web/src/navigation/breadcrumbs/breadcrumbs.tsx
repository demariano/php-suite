import colors from '@ui-config/colors';
import { Menu } from '@ui-types/menu';
import cn from 'classnames';
import { useRouter } from 'next/router';
import { ChevronRight } from '../../icons';

/* eslint-disable-next-line */
export interface BreadcrumbsProps { }

type Props = {
    className?: string,
    crumbs: Menu[],
    onClick?: (index: number) => void
}

export function Breadcrumbs({ className = '', crumbs, onClick }: Props): JSX.Element {
    const router = useRouter();

    const onClickCrumbDefault = (crumb: Menu) => {
        if (crumb?.route) {
            router.push(crumb.route);
        }
    };

    return (
        <div className='flex flex-row -mx-2'>
            {crumbs.map((crumb, i) => {
                const isLastItem = i + 1 === crumbs.length;

                return <div key={i} className='flex flex-row items-center'>
                    <div
                        className={cn('text-base', 'px-2', 'px-1', 'rounded', {
                            'text-N700': !isLastItem,
                            'text-N800 font-bold': isLastItem,
                            'hover:text-primary500 hover:bg-N100 cursor-pointer': !!crumb?.route
                        })}
                        onClick={() => onClick ? onClick(i) : onClickCrumbDefault(crumb)}>
                        {crumb.label}
                    </div>
                    {!isLastItem &&
                        <div className='p-0.5'>
                            <ChevronRight color={colors.N600} size={12} />
                        </div>
                    }
                </div>;
            })}
        </div>
    );
}

export default Breadcrumbs;

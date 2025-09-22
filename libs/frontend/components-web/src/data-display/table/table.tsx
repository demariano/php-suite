'use client';
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-prototype-builtins */
import cn from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { Sort } from '../../icons';
import Loader from '../loader/loader';
import NoAvailable from '../note/no-available/no-available';
import { Typography } from '../typography/typography';
import Paginate from './paginate/paginate';

export interface IPagination {
    currentPage: number;
    totalPerPage: number;
    sortBy: string;
    isAsc: boolean;
}
export interface IHeaderTable { key: string, label: string, align?: 'left' | 'right' }

export interface TableProps<T> {
    list: T[],
    /**
     * header key value should match field names
     */
    headers: IHeaderTable[],
    /**
     * used for search and sortBy keys
     */
    sortKeys?: Array<string>,

    /**
     * Display loader
     */
    isLoadingData?: boolean,
    /**
     * Set max number of items per page
     */
    itemsPerPage?: number,

    withPagination?: boolean,

    onPaginate?: (pagination: IPagination) => void,
    totalItems: number | null,

    /**
     * Enable display per page
     */
    showDisplayPerPage?: boolean;
    loaderSize?: number;
}

type ObjectValue = { [key: string]: string };

export const Table = <T extends object>({
    headers,
    list = [],
    withPagination,
    sortKeys = [],
    isLoadingData,
    itemsPerPage = 10,
    onPaginate,
    totalItems = null,
    showDisplayPerPage,
    loaderSize = 5,
}: TableProps<T>) => {
    const [sortBy, setSortBy] = useState<typeof sortKeys[number]>(sortKeys[0]);
    const [isAsc, setIsAsc] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPerPage, setTotalPerPage] = useState<number>(itemsPerPage);

    useEffect(() => {
        if (onPaginate) {
            onPaginate({ currentPage, totalPerPage, sortBy, isAsc });
        }
    }, [sortBy, isAsc, currentPage, totalPerPage, onPaginate]);

    const sortData = useMemo(() => {
        // @ts-ignore
        const sortedArray = list.sort((a: ObjectValue, b: ObjectValue) => {
            if (isAsc) {
                if (a[sortBy] < b[sortBy]) return -1;
                else if (a[sortBy] > b[sortBy]) return 1;
            } else {
                if (a[sortBy] > b[sortBy]) return -1;
                else if (a[sortBy] < b[sortBy]) return 1;
            }

            return 0;
        });

        return sortedArray.slice((currentPage - 1) * totalPerPage, currentPage * totalPerPage);
    }, [list, isAsc, sortBy, totalPerPage, currentPage]);

    const handlePageChange = (toPage: number) => {
        setCurrentPage(toPage);
    };

    const shouldIndent = (i: number) => {
        return i === 0 || i === headers.length - 1;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTotalPerPageChange = (e: any) => {
        setTotalPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    /**
     * Handles sorting of data based on the given key.
     *
     * @param {string} key - The key to sort the data by.
     */
    const handleSort = (key: string) => {
        if (key === sortBy) {
            setIsAsc(!isAsc);
        } else {
            setSortBy(key);
            setIsAsc(true);
        }

        setCurrentPage(1);
    };

    return (
        <div>
            <table className='table-auto border-collapse relative w-full rounded-lg overflow-hidden bg-secondaryNeutral-0 border border-secondaryNeutral-100'>
                <thead className='border-b border-secondaryNeutral-100'>
                    <tr className='border-b border-b-secondaryNeutral-100'>
                        {headers.map(({ key, label, align }, i) =>
                            <th className={cn([`px-4 py-3 top-0 bg-secondaryNeutral-75 text-${align || 'left'}`], { 'px-8': shouldIndent(i) })} key={key}>
                                {label
                                    ? <div className='flex-spaced items-center'>
                                        <Typography variant='body2' className={cn('text-secondaryNeutral-600 font-normal', { 'text-right': align === 'right' })}>
                                            {label}
                                        </Typography>

                                        {Boolean(sortKeys.length && sortKeys.includes(key)) &&
                                            <div onClick={() => handleSort(key)} className='px-1 cursor-pointer'>
                                                <Sort size={15} isAsc={isAsc} isActive={key === sortBy} />
                                            </div>
                                        }
                                    </div>
                                    : null}
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {isLoadingData ? (
                        [...Array(loaderSize)].map((_, i) => (
                            <tr key={i} className='border-b border-secondaryNeutral-100 transition'>
                                {headers.map(({ key, align }, i) => (
                                    <td className={cn('p-4', { 'px-8': shouldIndent(i) })} key={key} >
                                        <Loader className={cn('h-3 w-1/2 max-w-[11rem] rounded-full', { 'float-right': align === 'right' })} />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : sortData.length ? (
                        sortData.map(
                            // @ts-ignore
                            (item: { [key: string]: string }, i: number) => (
                                <tr key={i} className={cn('border-b border-secondaryNeutral-100 transition last:border-none')} >
                                    {headers.map(({ key, align }, i) => (
                                        <td
                                            className={cn('p-4', {
                                                'px-8': shouldIndent(i),
                                                [`${item.hasOwnProperty(`${key}Component`) ? 'float' : 'text'}-right`]: align === 'right',
                                            })}
                                            key={key} >
                                            {item.hasOwnProperty(`${key}Component`)
                                                ? item[`${key}Component`]
                                                : <div className='flex flex-row gap-2 items-center'>
                                                    <Typography
                                                        variant={key === sortBy ? 'body1-thicker' : 'body1'}
                                                        className={cn('text-secondaryNeutral-500', { 'flex-1': !item[`${key}SiblingComponent`] })} >
                                                        {item[key]}
                                                    </Typography>
                                                    {item[`${key}SiblingComponent`]}
                                                </div>
                                            }
                                        </td>
                                    ))}
                                </tr>
                            )
                        )
                    ) : (
                        <tr className='border-none'>
                            <td colSpan={headers.length} className={'p-4 text-center'} >
                                <NoAvailable
                                    title='No Results Found'
                                    message='Sorry, we couldn’t find any results that match your search. Please try again\nwith different keywords.'
                                />
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {(withPagination && !isLoadingData) ? (
                <table className='w-full'>
                    <tr className={cn({ 'invisible pointer-events-none': !(!isLoadingData && sortData.length) })}>
                        <td colSpan={headers.length} align='right' className='py-6'>
                            <Paginate
                                totalItems={totalItems}
                                totalPerPage={totalPerPage}
                                currentPage={currentPage}
                                handleTotalPerPageChange={handleTotalPerPageChange}
                                handlePageChange={handlePageChange}
                                showDisplayPerPage={showDisplayPerPage}
                            />
                        </td>
                    </tr>
                </table>
            ) : null}
        </div>
    );
};

export default Table;

import { useMemo } from 'react';
import { Button } from '../../../form-controls/button/button';
import Typography from '../../typography/typography';
import styles from './paginate.module.scss';


export interface PaginateProps {
    totalPerPage: number,
    /**
     * totalItems should be `null` if count over total should not display
     */
    totalItems: number | null,
    /**
     * nextEnabled should be a boolean if totalItems === null
     */
    nextEnabled?: boolean | undefined,
    /**
     * prevEnabled should be a boolean if totalItems === null
     */
    prevEnabled?: boolean | undefined,
    currentPage: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleTotalPerPageChange: (e: any) => void,
    handlePageChange: (value: number, direction: 'prev' | 'next') => void,
    showDisplayPerPage?: boolean
}

export function Paginate({
    totalPerPage, totalItems, currentPage, handleTotalPerPageChange, handlePageChange,
    nextEnabled, prevEnabled, showDisplayPerPage = true
}: PaginateProps) {
    const isPrevEnabled = useMemo(() => {
        return (prevEnabled && !totalItems) || !(currentPage <= 1);
    }, [currentPage, prevEnabled, totalItems]);

    const isNextEnabled = useMemo(() => {
        return !totalItems ? nextEnabled : ((currentPage * totalPerPage) < totalItems);
    }, [currentPage, nextEnabled, totalItems, totalPerPage]);

    return (
        <div className={styles['pagination']}>
            <Button
                label='Prev'
                variant='tertiary'
                onClick={() => handlePageChange(currentPage - 1, 'prev')}
                disabled={!isPrevEnabled} />

            {showDisplayPerPage && (
                <div className="flex flex-row">
                    <Typography className='text-secondaryNeutral-700'>Rows per page: </Typography>
                    <select
                        onChange={handleTotalPerPageChange}
                        value={totalPerPage}
                        className="outline-none text-N800"
                    >
                        <option>10</option>
                        <option>20</option>
                        <option>50</option>
                        <option>100</option>
                    </select>
                </div>
            )}

            {totalItems && (
                <Typography >
                    {(currentPage * totalPerPage + 1) - totalPerPage} to {currentPage * totalPerPage > totalItems ? totalItems : currentPage * totalPerPage} of {totalItems}
                </Typography>
            )}

            <Button
                label='Next'
                onClick={() => handlePageChange(currentPage + 1, 'next')}
                disabled={!isNextEnabled} />
        </div>
    );
}

export default Paginate;

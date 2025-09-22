import { Warning } from '../../../icons';
import Typography from '../../typography/typography';

export function ErrorLoadingData() {
    return (
        <div className='flex flex-col items-center justify-center p-6'>
            <Warning size={56} />
            <Typography variant='body1-thicker' className='text-secondaryNeutral-800 mt-4'>Error loading data</Typography>
            <Typography className='text-secondaryNeutral-700 mt-2 text-center'>
                An error occurred while loading the chart. Please try again later or contact Support for assistance.
            </Typography>
        </div>
    );
}

export default ErrorLoadingData;

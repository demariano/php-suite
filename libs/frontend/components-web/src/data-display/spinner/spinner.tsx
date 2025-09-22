import { Loading } from '../../icons/Loading';
import styles from './spinner.module.scss';

/* eslint-disable-next-line */
export interface SpinnerProps {
    size?: number;
}

export function Spinner({ size = 16 }: SpinnerProps) {
    return <Loading size={size} className={styles.spinner} />;
}

export default Spinner;

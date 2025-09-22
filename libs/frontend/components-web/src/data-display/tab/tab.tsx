import cn from 'classnames';
import styles from './tab.module.scss';
interface TabProps {
    options: {
        label: string;
        value: string;
    }[];
    activeTab: string;
    onChange: (value: string) => void;
}

export const Tab = ({ options, activeTab, onChange }: TabProps) => {
    return (
        <div className={styles.tab}>
            {options.map((option) => (
                <div
                    key={option.value}
                    className={cn(styles.tab__option, {
                        [styles['--selected']]: activeTab === option.value,
                    })}
                    onClick={() => onChange(option.value)}>
                    <span className={styles['tab__option-label']}>
                        {option.label}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default Tab;
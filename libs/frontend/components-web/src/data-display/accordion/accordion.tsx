import {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    Transition,
} from '@headlessui/react';
import cn from 'classnames';
import { ChevronDown, ChevronUp } from '../../icons';
import styles from './accordion.module.scss';
import { Typography } from '../typography/typography';

export interface AccordionProps {
    /** add `label` for text toggles only */
    label?: string;

    /** supply `triggerToggle` if custom toggle is needed */
    triggerToggle?: React.ReactNode;

    /** show Chevron icon if enabled */
    withIcon?: boolean;

    /** content to display */
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}

export function Accordion({
    label = 'Placeholder label',
    triggerToggle,
    className,
    children,
    withIcon = true,
    contentClassName = styles['accordion__panel'],
}: AccordionProps) {
    return (
        <Disclosure as="div" className={cn(styles.accordion, className)}>
            {({ open }) => (
                <>
                    <DisclosureButton className={styles['accordion__trigger']}>
                        {triggerToggle ? (
                            triggerToggle
                        ) : (
                            <Typography variant="body2-thicker">
                                {label}
                            </Typography>
                        )}
                        {withIcon && (
                            <div>
                                {!open ? (
                                    <ChevronDown size={20} />
                                ) : (
                                    <ChevronUp size={20} />
                                )}
                            </div>
                        )}
                    </DisclosureButton>

                    <Transition
                        enter="transition duration-100 ease-out"
                        enterFrom="-translate-y-5 opacity-0"
                        enterTo="translate-y-0 opacity-100"
                        leave="transition ease-out duration-100"
                        leaveFrom="translate-y-0 opacity-100"
                        leaveTo="-translate-y-5 opacity-0"
                    >
                        <DisclosurePanel className={contentClassName}>
                            {children}
                        </DisclosurePanel>
                    </Transition>
                </>
            )}
        </Disclosure>
    );
}

export default Accordion;

/* eslint-disable react/jsx-no-useless-fragment */
import { Arrow, Content, Portal, Provider, Root, Trigger } from '@radix-ui/react-tooltip';
import cn from 'classnames';
import { ReactNode } from 'react';
import cx from './tooltip.module.scss';

interface TooltipProps {
    children: JSX.Element
    content: string | ReactNode
    position?: 'top' | 'right' | 'bottom' | 'left',
    align?: 'start' | 'center' | 'end',
    disableHoverableContent?: boolean,
    delayDuration?: number,
    contentClassName?: string,
    avoidCollisions?: boolean,
    className?: string
}

const Tooltip = ({
    children, content, position = 'bottom', disableHoverableContent, delayDuration = 500, contentClassName, avoidCollisions = false, className,
    align = 'center'
}: TooltipProps) => {
    return (
        <div className={cn(cx['tooltip-wrapper'], { [`${className}`]: !!className })}>
            <Provider delayDuration={delayDuration}>
                <Root open={disableHoverableContent}>
                    <Trigger asChild={true}>
                        {children}
                    </Trigger>
                    <Portal>
                        <Content
                            side={position}
                            className={cn({ [cx['tooltip-content']]: typeof content === 'string' }, contentClassName)}
                            align={align}
                            avoidCollisions={avoidCollisions}>
                            {content}
                            <Arrow
                                className={cx['tooltip-arrow']}
                                width={20}
                                height={11} />
                        </Content>
                    </Portal>
                </Root>
            </Provider>
        </div>
    );
};

export default Tooltip;

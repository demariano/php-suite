'use client';

/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    Transition,
} from '@headlessui/react';
import { Placement } from '@popperjs/core';
import cn from 'classnames';
import React, { Fragment, ReactNode, useState } from 'react';
import { usePopper } from 'react-popper';
import IIcon from '../../types/icons';
import styles from './dropdown-menu.module.scss';

export interface DropdownMenuProps {
    menu: Array<
        {
            label: string;
            icon?: React.ElementType<IIcon>;
            onClick?: () => void;
        }[]
    >;
    placement?: Placement;
    trigger: ReactNode;
    triggerClassname?: string;
    panelClassname?: string;
    className?: string;
}

export function DropdownMenu({
    menu,
    placement,
    trigger,
    triggerClassname,
    panelClassname,
    className,
}: DropdownMenuProps) {
    const [referenceElement, setReferenceElement] = useState();
    const [popperElement, setPopperElement] = useState();
    const { styles: popperStyles, attributes } = usePopper(
        referenceElement,
        popperElement,
        {
            placement,
        }
    );

    return (
        <div className={cn(styles['dropdown-menu'], className)}>
            <Menu as="div" className="relative inline-block text-left">
                <MenuButton
                    // @ts-ignore
                    ref={setReferenceElement}
                    className={cn(triggerClassname, 'outline-none')}
                >
                    {trigger}
                </MenuButton>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <MenuItems
                        className={styles['dropdown-menu__panel']}
                        // @ts-ignore
                        ref={setPopperElement}
                        style={popperStyles.popper}
                        {...attributes.popper}
                    >
                        <div
                            className={cn(
                                styles['dropdown-menu__panel-content'],
                                panelClassname
                            )}
                        >
                            {menu.map((menuItems, mi) => (
                                <div className="py-1" key={mi}>
                                    {menuItems.map(
                                        ({ label, icon: Icon, onClick }, i) => (
                                            <MenuItem key={i}>
                                                {({ active }) => (
                                                    <button
                                                        onClick={onClick}
                                                        className={cn(styles['dropdown-menu__panel-option'], {
                                                            [styles['-active']]: active, //[styles['-selected']]: selected === label
                                                        })}
                                                    >
                                                        {Icon && (
                                                            <div className={styles['dropdown-menu__panel-option-icon']}>
                                                                <Icon size={18} />
                                                            </div>
                                                        )}

                                                        {label}
                                                    </button>
                                                )}
                                            </MenuItem>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </MenuItems>
                </Transition>
            </Menu>
        </div>
    );
}

export default DropdownMenu;

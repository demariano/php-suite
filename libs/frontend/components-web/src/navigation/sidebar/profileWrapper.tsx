import cn from 'classnames';
import Tooltip from '../../data-display/tooltip/tooltip';
import DropdownMenu from '../../form-controls/dropdown-menu/dropdown-menu';

interface IProfileWrapper {
    isCollapsed: boolean,
    onLogout: () => void,
    children: JSX.Element
}

const ProfileWrapper = ({ isCollapsed, onLogout, children }: IProfileWrapper) => {
    return (
        <div className={cn({ 'mx-auto': isCollapsed })}>
            {
                isCollapsed
                    ? <Tooltip
                        content={'Logout'}
                        delayDuration={0}
                        position='right'
                        contentClassName='ml-8 -mt-0.5'>
                        {children}
                    </Tooltip>
                    : <DropdownMenu
                        menu={[[{ label: 'Logout', onClick: onLogout }]]}
                        className={cn({ 'pr-5': !isCollapsed, 'pl-7': !isCollapsed })}
                        triggerClassname='w-[14.5rem]'
                        trigger={children} />
            }
        </div>
    );
};

export default ProfileWrapper;

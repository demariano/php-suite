'use client';

import Sidebar from '@components-web/navigation/sidebar/sidebar';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SidebarWrapperProps {
  menu: any[];
  profile: any;
  onLogout: () => void;
  isToggleDisabled: boolean;
  version: string;
}

export const SidebarWrapper = ({ menu, profile, onLogout, isToggleDisabled, version }: SidebarWrapperProps) => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading sidebar...</div>;
  }

  return (
    <Sidebar
      menu={menu}
      profile={profile}
      onLogout={onLogout}
      isToggleDisabled={isToggleDisabled}
      version={version}
    />
  );
};

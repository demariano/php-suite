'use client';

import {
    Settings
} from '@components-web/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CustomSidebarProps {
  menu: any[];
  profile: any;
  onLogout: () => void;
  isToggleDisabled: boolean;
  version: string;
}

export const CustomSidebar = ({ menu, profile, onLogout, isToggleDisabled, version }: CustomSidebarProps) => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-80 h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-white">Loading sidebar...</div>
      </div>
    );
  }

  const handleNavigation = (route: string) => {
    router.push(route);
  };

  return (
    <div className="w-80 h-screen bg-blue-600 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-blue-500">
        <div className="flex items-center">
          <img src="/assets/images/logo.png" alt="logo" width={84} height={27} />
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto p-4">
        {menu.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-3">
              {section.sectionTitle}
            </h3>
            <div className="space-y-1">
              {section.menuItems.map((item: any, itemIndex: number) => {
                const isActive = pathname === item.route || pathname.startsWith(item.route + '/');
                return (
                  <button
                    key={itemIndex}
                    onClick={() => handleNavigation(item.route)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <div className="mr-3">
                      <item.icon size={20} />
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile */}
      {profile && (
        <div className="p-4 border-t border-blue-500">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium">
                {profile.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile.name}</div>
              <div className="text-xs text-blue-200 truncate">{profile.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="ml-2 p-1 text-blue-200 hover:text-white transition-colors"
              title="Logout"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Version */}
      {version && (
        <div className="p-4 text-xs text-blue-300 text-center">
          {version}
        </div>
      )}
    </div>
  );
};
'use client';

// Removed icon imports to avoid import issues
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SimpleSidebarProps {
  menu: any[];
  profile: any;
  onLogout: () => void;
  isToggleDisabled: boolean;
  version: string;
}

export const SimpleSidebar = ({ menu, profile, onLogout, isToggleDisabled, version }: SimpleSidebarProps) => {
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ width: '320px', height: '100vh', backgroundColor: '#1e40af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading sidebar...</div>
      </div>
    );
  }

  const handleNavigation = (route: string) => {
    router.push(route);
  };

  const toggleExpanded = (itemLabel: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemLabel)) {
        newSet.delete(itemLabel);
      } else {
        newSet.add(itemLabel);
      }
      return newSet;
    });
  };

  return (
    <div style={{ width: '280px', height: '100vh', backgroundColor: '#f8fafc', color: '#1f2937', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/assets/images/logo.png" alt="logo" width={84} height={27} />
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {menu.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.menuItems.map((item: any, itemIndex: number) => {
              const isActive = pathname === item.route || pathname.startsWith(item.route + '/');
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedItems.has(item.label);
              
              return (
                <div key={itemIndex}>
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        toggleExpanded(item.label);
                      } else {
                        handleNavigation(item.route);
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#e0e7ff' : 'transparent',
                      color: isActive ? '#6366f1' : '#374151',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      justifyContent: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ 
                      marginRight: '12px', 
                      width: '20px', 
                      height: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: isActive ? '#6366f1' : '#6b7280'
                    }}>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: isActive ? '#6366f1' : '#9ca3af', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {item.label.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {hasSubItems && (
                      <div style={{
                        marginLeft: '8px',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        ▼
                      </div>
                    )}
                  </button>
                  
                  {/* Sub-menu items */}
                  {hasSubItems && isExpanded && (
                    <div style={{ backgroundColor: '#f9fafb', borderLeft: '2px solid #e5e7eb' }}>
                      {item.subItems.map((subItem: any, subIndex: number) => {
                        const isSubActive = pathname === subItem.route || pathname.startsWith(subItem.route + '/');
                        return (
                          <button
                            key={subIndex}
                            onClick={() => handleNavigation(subItem.route)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 20px 8px 40px',
                              fontSize: '13px',
                              fontWeight: '400',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: isSubActive ? '#e0e7ff' : 'transparent',
                              color: isSubActive ? '#6366f1' : '#6b7280',
                              transition: 'all 0.2s ease',
                              textAlign: 'left',
                              justifyContent: 'flex-start'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <div style={{ 
                              marginRight: '8px', 
                              width: '4px', 
                              height: '4px', 
                              backgroundColor: isSubActive ? '#6366f1' : '#9ca3af',
                              borderRadius: '50%'
                            }} />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>


      {/* Version */}
      {version && (
        <div style={{ 
          padding: '12px 20px', 
          fontSize: '11px', 
          color: '#9ca3af', 
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb'
        }}>
          {version}
        </div>
      )}
    </div>
  );
};

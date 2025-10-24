'use client';

import {
  Dashboard,
  File,
  Groups,
  Reporting
} from '@components-web/icons';
import { Menu } from '@components-web/types/menu';
import { WithRequiredProperty } from '@components-web/types/utility';
import { usePathname } from 'next/navigation';

// Navigation structure for the sidebar
export const getSidebarNavigation = (onNavigate?: (route: string) => void): Array<{
  sectionTitle: string;
  menuItems: WithRequiredProperty<Menu, 'icon'>[];
}> => {
  return [
    {
      sectionTitle: "Overview",
      menuItems: [
        { 
          label: "Dashboard", 
          route: "/dashboard", 
          icon: Dashboard,
          onClick: (route: string) => onNavigate?.(route)
        }
      ]
    },
    {
      sectionTitle: "Products",
      menuItems: [
        { 
          label: "Products", 
          route: "/products/product", 
          icon: File,
          onClick: (route: string) => onNavigate?.(route),
          subItems: [
            { 
              label: "Products", 
              route: "/products/product", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Categories", 
              route: "/products/categories", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Classes", 
              route: "/products/classes", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Units", 
              route: "/products/units", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Price Types", 
              route: "/products/price-types", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Deals", 
              route: "/products/deals", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            }
          ],
          isExpanded: false
        }
      ]
    },
    {
      sectionTitle: "Customers", 
      menuItems: [
        { 
          label: "Customers", 
          route: "/customers/customer", 
          icon: Groups,
          onClick: (route: string) => onNavigate?.(route),
          subItems: [
            { 
              label: "Customers", 
              route: "/customers/customer", 
              icon: Groups,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Areas", 
              route: "/customers/areas", 
              icon: Groups,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Towns", 
              route: "/customers/towns", 
              icon: Groups,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Classifications", 
              route: "/customers/classifications", 
              icon: Groups,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Types", 
              route: "/customers/types", 
              icon: Groups,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Terms", 
              route: "/customers/terms", 
              icon: Groups,
              onClick: (route: string) => onNavigate?.(route)
            }
          ],
          isExpanded: false
        }
      ]
    },
    {
      sectionTitle: "Inventory",
      menuItems: [
        { 
          label: "Inventory", 
          route: "/inventory/stock", 
          icon: File,
          onClick: (route: string) => onNavigate?.(route),
          subItems: [
            { 
              label: "Inventory", 
              route: "/inventory/stock", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Stock", 
              route: "/inventory/stock", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Stock Types", 
              route: "/inventory/stock-types", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            }
          ],
          isExpanded: false
        }
      ]
    },
    {
      sectionTitle: "Business",
      menuItems: [
        { 
          label: "Invoicing", 
          route: "/invoicing/invoice", 
          icon: File,
          onClick: (route: string) => onNavigate?.(route),
          subItems: [
            { 
              label: "Invoices", 
              route: "/invoicing/invoice", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Payments", 
              route: "/invoicing/payment", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Return Good Sold", 
              route: "/invoicing/return-good-sold", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Contracts", 
              route: "/invoicing/contract", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Sales Types", 
              route: "/invoicing/sales-type", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            },
            { 
              label: "Territory Managers", 
              route: "/invoicing/territory-manager", 
              icon: File,
              onClick: (route: string) => onNavigate?.(route)
            }
          ],
          isExpanded: false
        }
      ]
    },
    {
      sectionTitle: "Reports",
      menuItems: [
        { 
          label: "Reports", 
          route: "/reports", 
          icon: Reporting,
          onClick: (route: string) => onNavigate?.(route)
        }
      ]
    },
    {
      sectionTitle: "System",
      menuItems: [
        { 
          label: "Users", 
          route: "/users", 
          icon: Groups,
          onClick: (route: string) => onNavigate?.(route)
        },
        { 
          label: "Settings", 
          route: "/settings", 
          icon: File,
          onClick: (route: string) => onNavigate?.(route)
        }
      ]
    }
  ];
};

// Hook to get current navigation state
export const useNavigationState = () => {
  const pathname = usePathname();
  
  const isRouteActive = (route: string) => {
    if (pathname === route) return true;
    if (route !== '/dashboard' && pathname.startsWith(route + '/')) return true;
    return false;
  };

  const isParentActive = (subItems?: Menu[]) => {
    if (!subItems) return false;
    return subItems.some(item => isRouteActive(item.route || ''));
  };

  const shouldAutoExpand = (route: string, subItems?: Menu[]) => {
    if (!subItems) return false;
    return isRouteActive(route) || isParentActive(subItems);
  };
  
  return {
    currentPath: pathname,
    isRouteActive,
    isParentActive,
    shouldAutoExpand
  };
};

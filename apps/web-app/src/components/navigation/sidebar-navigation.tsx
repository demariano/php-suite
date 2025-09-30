'use client';

import {
  Customers,
  Dashboard,
  File,
  Groups,
  Inventory,
  Products,
  Reports,
  Settings
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
          onClick: (route) => onNavigate?.(route)
        }
      ]
    },
    {
      sectionTitle: "Products",
      menuItems: [
        { 
          label: "Products", 
          route: "/products", 
          icon: Products,
          onClick: (route) => onNavigate?.(route),
          subItems: [
            {
              label: "Products",
              route: "/products",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Categories",
              route: "/products/categories",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Classes",
              route: "/products/classes",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Units",
              route: "/products/units",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Price Types",
              route: "/products/price-types",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Deals",
              route: "/products/deals",
              onClick: (route) => onNavigate?.(route)
            }
          ]
        }
      ]
    },
    {
      sectionTitle: "Customers", 
      menuItems: [
        { 
          label: "Customers", 
          route: "/customers", 
          icon: Customers,
          onClick: (route) => onNavigate?.(route),
          subItems: [
            {
              label: "Customers",
              route: "/customers",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Classifications",
              route: "/customers/classifications",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Types",
              route: "/customers/types",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Terms",
              route: "/customers/terms",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Areas",
              route: "/customers/areas",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Towns",
              route: "/customers/towns",
              onClick: (route) => onNavigate?.(route)
            }
          ]
        }
      ]
    },
    {
      sectionTitle: "Inventory",
      menuItems: [
        { 
          label: "Inventory", 
          route: "/inventory", 
          icon: Inventory,
          onClick: (route) => onNavigate?.(route),
          subItems: [
            {
              label: "Stock Levels",
              route: "/inventory/stock",
              onClick: (route) => onNavigate?.(route)
            },
            {
              label: "Stock Types",
              route: "/inventory/stock-types",
              onClick: (route) => onNavigate?.(route)
            }
          ]
        }
      ]
    },
    {
      sectionTitle: "Business",
      menuItems: [
        { 
          label: "Invoicing", 
          route: "/invoicing", 
          icon: File,
          onClick: (route) => onNavigate?.(route)
        }
      ]
    },
    {
      sectionTitle: "Reports",
      menuItems: [
        { 
          label: "Reports", 
          route: "/reports", 
          icon: Reports,
          onClick: (route) => onNavigate?.(route)
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
          onClick: (route) => onNavigate?.(route)
        },
        { 
          label: "Settings", 
          route: "/settings", 
          icon: Settings,
          onClick: (route) => onNavigate?.(route)
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
  
  return {
    currentPath: pathname,
    isRouteActive
  };
};

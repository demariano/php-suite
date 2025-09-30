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
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Navigation structure based on your backend services
const navigationModules = [
  {
    sectionTitle: "Overview",
    menuItems: [
      { 
        label: "Dashboard", 
        route: "/dashboard", 
        icon: Dashboard,
        description: "Main dashboard overview"
      }
    ]
  },
  {
    sectionTitle: "Product Management",
    menuItems: [
      { 
        label: "Products", 
        route: "/products", 
        icon: Products,
        description: "Manage product catalog"
      }
    ]
  },
  {
    sectionTitle: "Customer Management", 
    menuItems: [
      { 
        label: "Customers", 
        route: "/customers", 
        icon: Customers,
        description: "Customer database"
      }
    ]
  },
  {
    sectionTitle: "Inventory & Stock",
    menuItems: [
      { 
        label: "Stock Levels", 
        route: "/inventory/stock", 
        icon: Inventory,
        description: "Current stock levels"
      }
    ]
  },
  {
    sectionTitle: "Business Operations",
    menuItems: [
      { 
        label: "Invoicing", 
        route: "/invoicing", 
        icon: File,
        description: "Invoice management"
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
        description: "Business analytics and reporting"
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
        description: "User management"
      },
      { 
        label: "Settings", 
        route: "/settings", 
        icon: Settings,
        description: "System configuration"
      }
    ]
  }
];

export interface MainNavigationProps {
  onNavigate?: (route: string) => void;
  currentRoute?: string;
}

export const MainNavigation = ({ onNavigate, currentRoute }: MainNavigationProps) => {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleNavigation = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      router.push(route);
    }
  };

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle);
    } else {
      newExpanded.add(sectionTitle);
    }
    setExpandedSections(newExpanded);
  };

  const isRouteActive = (route: string) => {
    if (!currentRoute) return false;
    return currentRoute === route || currentRoute.startsWith(route + '/');
  };

  return (
    <div className="navigation-container">
      {navigationModules.map((module) => (
        <div key={module.sectionTitle} className="navigation-module">
          <div 
            className="navigation-module-header"
            onClick={() => toggleSection(module.sectionTitle)}
          >
            <h3 className="navigation-module-title">{module.sectionTitle}</h3>
            <span className="navigation-module-toggle">
              {expandedSections.has(module.sectionTitle) ? '−' : '+'}
            </span>
          </div>
          
          {expandedSections.has(module.sectionTitle) && (
            <div className="navigation-module-items">
              {module.menuItems.map((item) => (
                <div
                  key={item.route}
                  className={`navigation-item ${isRouteActive(item.route) ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.route)}
                >
                  <div className="navigation-item-icon">
                    <item.icon size={20} />
                  </div>
                  <div className="navigation-item-content">
                    <div className="navigation-item-label">{item.label}</div>
                    <div className="navigation-item-description">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MainNavigation;

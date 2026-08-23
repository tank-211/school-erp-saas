/**
 * Routes Configuration
 * Centralized route definitions for the application
 * Separates route configuration from component logic
 */

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Tasks from './pages/Tasks';
import Communication from './pages/Communication';
import Applications from './pages/Applications';
import Settings from './pages/Settings';
import SalesReports from './pages/reports/SalesReports';
import Performance from './pages/reports/Performance';
import CustomReports from './pages/reports/CustomReports';

/**
 * Public Routes (no authentication required)
 * These routes don't need ProtectedRoute wrapper
 * Rendered without sidebar/header (AuthLayout)
 */
export const publicRoutes = [
  {
    path: '/login',
    element: <Login />,
    exact: true,
    label: 'Login'
  },
  {
    path: '/register',
    element: <Register />,
    exact: true,
    label: 'Register'
  },
];

/**
 * Protected Routes (authentication required)
 * These routes need ProtectedRoute wrapper
 * Rendered with sidebar/header (MainLayout)
 */
export const protectedRoutes = [
  {
    path: '/',
    element: <Dashboard />,
    exact: true,
    label: 'Home',
    showInMenu: false,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
    exact: true,
    label: 'Dashboard',
    icon: 'dashboard',
    showInMenu: true,
  },
  {
    path: '/leads',
    element: <Leads />,
    exact: true,
    label: 'Leads',
    icon: 'leads',
    showInMenu: true,
  },
  {
    path: '/pipeline',
    element: <Pipeline />,
    exact: true,
    label: 'Pipeline',
    icon: 'pipeline',
    showInMenu: true,
  },
  {
    path: '/tasks',
    element: <Tasks />,
    exact: true,
    label: 'Tasks',
    icon: 'tasks',
    showInMenu: true,
  },
  {
    path: '/communication',
    element: <Communication />,
    exact: true,
    label: 'Communication',
    icon: 'communication',
    showInMenu: true,
  },
  {
    path: '/applications',
    element: <Applications />,
    exact: true,
    label: 'Applications',
    icon: 'applications',
    showInMenu: true,
  },
  {
    path: '/reports',
    element: <SalesReports />,
    exact: false,
    label: 'Reports',
    icon: 'reports',
    showInMenu: true,
    children: [
      {
        path: '/reports/sales',
        element: <SalesReports />,
        label: 'Sales Reports',
      },
      {
        path: '/reports/performance',
        element: <Performance />,
        label: 'Performance',
      },
      {
        path: '/reports/custom',
        element: <CustomReports />,
        label: 'Custom Reports',
      },
    ],
  },
  {
    path: '/settings',
    element: <Settings />,
    exact: true,
    label: 'Settings',
    icon: 'settings',
    showInMenu: true,
  },
];

/**
 * Flatten nested routes for easy access
 */
export const getAllRoutes = () => {
  const routes = [...publicRoutes];

  protectedRoutes.forEach(route => {
    routes.push(route);
    if (route.children) {
      routes.push(...route.children);
    }
  });

  return routes;
};

/**
 * Get menu items from routes
 * Filter routes that should appear in sidebar menu
 */
export const getMenuItems = () => {
  return protectedRoutes.filter(route => route.showInMenu);
};

export default {
  publicRoutes,
  protectedRoutes,
  getAllRoutes,
  getMenuItems,
};
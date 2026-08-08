import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <DashboardPage />,
  },
  // Unknown/legacy paths (e.g. /torrent/:id, /settings) fall back to the dashboard.
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

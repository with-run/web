import { createBrowserRouter } from 'react-router-dom';

import { privateRoutes } from './privateRoutes';
import { publicRoutes } from './publicRoutes';
import { EntryPage } from '@/pages/public/Entry';

export const router = createBrowserRouter([
  { path: '/', element: <EntryPage /> },
  ...publicRoutes,
  ...privateRoutes,
]);

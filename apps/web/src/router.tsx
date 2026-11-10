import {
  createRootRoute,
  type RouterHistory,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import { AppLayout } from './components/layout';
import { AssetDetailsPage } from './pages/asset-details';
import { AssetEditPage } from './pages/asset-edit';
import { AssetNewPage } from './pages/asset-new';
import { AssetViewPage } from './pages/asset-view';
import { AssetsPage } from './pages/assets';
import { ExecutorFormPage } from './pages/executor-form';
import { ExecutorsPage } from './pages/executors';
import { LoginPage } from './pages/login';
import { PeoplePage } from './pages/people';
import { PersonFormPage } from './pages/person-form';
import { RegisterPage } from './pages/register';
import { ResiduaryPage } from './pages/residuary';
import { ReviewPage } from './pages/review';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const route = <TPath extends string>(path: TPath, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => appRoute, path, component });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/assets" />,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

// Everything below needs a session; AppLayout sends signed-out visitors to /login.
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: 'app', component: AppLayout });

export const createAppRouter = (history?: RouterHistory) =>
  createRouter({
    history,
    routeTree: rootRoute.addChildren([
      indexRoute,
      loginRoute,
      registerRoute,
      appRoute.addChildren([
        route('/assets', AssetsPage),
        route('/assets/new', AssetNewPage),
        route('/assets/$id', AssetViewPage),
        route('/assets/$id/edit', AssetEditPage),
        route('/assets/$id/details', AssetDetailsPage),
        route('/people', PeoplePage),
        route('/people/new', PersonFormPage),
        route('/people/$id', PersonFormPage),
        route('/executors', ExecutorsPage),
        route('/executors/new', ExecutorFormPage),
        route('/executors/$id', ExecutorFormPage),
        route('/residuary', ResiduaryPage),
        route('/review', ReviewPage),
      ]),
    ]),
  });

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

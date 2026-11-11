import {
  createRootRoute,
  type RouterHistory,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from '@tanstack/react-router';
import { AppLayout } from './components/layout';
import { AssetEditPage } from './pages/asset-edit';
import { AssetViewPage } from './pages/asset-view';
import { BeneficiariesPage } from './pages/beneficiaries';
import { AssetsPage } from './pages/assets';
import { DraftWillPage } from './pages/draft-will';
import { ExecutorsPage } from './pages/executors';
import { LoginPage } from './pages/login';
import { OrganizationsPage } from './pages/organizations';
import { ProfilePage } from './pages/profile';
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
        route('/assets/$id', AssetViewPage),
        route('/assets/$id/edit', AssetEditPage),
        route('/beneficiaries', BeneficiariesPage),
        route('/organizations', OrganizationsPage),
        route('/executors', ExecutorsPage),
        route('/residuary', ResiduaryPage),
        route('/review', ReviewPage),
        route('/draft', DraftWillPage),
        route('/profile', ProfilePage),
      ]),
    ]),
  });

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

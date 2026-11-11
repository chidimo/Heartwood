import { Link } from '@tanstack/react-router';
import {
  Building2,
  ClipboardCheck,
  FileText,
  LogOut,
  PieChart,
  Scale,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';

interface NavItem {
  to:
    | '/assets'
    | '/beneficiaries'
    | '/organizations'
    | '/executors'
    | '/residuary'
    | '/review'
    | '/draft';
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: '/assets', label: 'Assets', icon: Wallet },
  { to: '/beneficiaries', label: 'Beneficiaries', icon: Users },
  { to: '/organizations', label: 'Organisations', icon: Building2 },
  { to: '/executors', label: 'Executors and lawyers', icon: Scale },
  { to: '/residuary', label: 'Everything else', icon: PieChart },
  { to: '/review', label: 'Review', icon: ClipboardCheck },
  { to: '/draft', label: 'Draft will', icon: FileText },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  name?: string;
  email?: string;
  onSignOut: () => void;
}

const Brand = () => (
  <Link to="/assets" className="px-2 text-lg font-semibold text-primary-700 dark:text-primary-200">
    Heartwood
  </Link>
);

const NavList = ({ onNavigate }: { onNavigate: () => void }) => (
  <nav aria-label="Main" className="flex flex-col gap-1">
    {NAV.map(({ to, label, icon: Icon }) => (
      <Link
        key={to}
        to={to}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition-colors',
          'hover:bg-primary-600/10 hover:text-ink dark:text-white/70 dark:hover:text-white',
          '[&.active]:bg-primary-600/15 [&.active]:text-primary-700 dark:[&.active]:text-primary-200'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {label}
      </Link>
    ))}
  </nav>
);

const AccountFooter = ({
  name,
  email,
  onSignOut,
  onNavigate,
}: Omit<Props, 'isOpen' | 'onClose'> & { onNavigate: () => void }) => (
  <div className="border-t border-primary-600/20 pt-3">
    <Link
      to="/profile"
      onClick={onNavigate}
      aria-label="Your profile"
      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-primary-600/10 [&.active]:bg-primary-600/15"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-xs font-semibold text-primary-700 dark:text-primary-200"
      >
        {(name ?? email ?? '?').slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 text-sm">
        <span className="block truncate font-medium">{name}</span>
        {email && (
          <span className="block truncate text-xs text-ink/60 dark:text-white/60">{email}</span>
        )}
      </span>
    </Link>
    <button
      type="button"
      onClick={onSignOut}
      className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-primary-600/10 dark:text-white/70"
    >
      <LogOut className="h-5 w-5 shrink-0" aria-hidden />
      Sign out
    </button>
  </div>
);

/** Fixed sidebar on wide screens; a slide-in drawer on narrow ones. */
export const Sidebar = ({ isOpen, onClose, name, email, onSignOut }: Props) => (
  <>
    <aside className="hidden print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-primary-600/20 lg:bg-white dark:lg:bg-ink">
      <div className="flex h-16 shrink-0 items-center px-4">
        <Brand />
      </div>
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 pb-4">
        <NavList onNavigate={() => {}} />
        <AccountFooter name={name} email={email} onSignOut={onSignOut} onNavigate={() => {}} />
      </div>
    </aside>

    <div className="lg:hidden">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        aria-label="Navigation drawer"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-full flex-col bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-ink',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 hover:bg-primary-600/10"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 pb-4">
          <NavList onNavigate={onClose} />
          <AccountFooter name={name} email={email} onSignOut={onSignOut} onNavigate={onClose} />
        </div>
      </aside>
    </div>
  </>
);

import type { ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A form in a dialog: Escape or the backdrop closes it. Render it only while it should show. */
export const Modal = ({ title, onClose, children }: Props) => (
  <Dialog open onClose={onClose} className="relative z-50">
    <div className="fixed inset-0 bg-black/50" aria-hidden />
    <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
      <DialogPanel className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-primary-600/20 bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-2xl dark:bg-ink">
        <div className="mb-4 flex items-start justify-between gap-4">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 rounded-lg p-2 hover:bg-primary-600/10"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </DialogPanel>
    </div>
  </Dialog>
);

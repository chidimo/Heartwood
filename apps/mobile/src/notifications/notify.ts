import { toast } from 'sonner-native';

/**
 * In-app notifications (toasts). Import this, never `sonner-native` directly, so the library can
 * change in one place.
 *
 *   notify.success('Asset saved');
 *   notify.error("Couldn't save", 'Check your connection and try again.');
 */
export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  error: (title: string, description?: string) => toast.error(title, { description }),
  info: (title: string, description?: string) => toast(title, { description }),
};

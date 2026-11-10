/** Asks before something that can't be undone from the app. */
export const confirmDestructive = (message: string): boolean => window.confirm(message);

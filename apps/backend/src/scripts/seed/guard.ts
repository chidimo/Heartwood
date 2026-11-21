const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Dev seed and reset create accounts with known passwords and drop tables, so they must never run
 * against anything but a local database. Throws unless DATABASE_URL points at this machine.
 */
export const assertLocalDatabase = (url: string | undefined, nodeEnv = process.env.NODE_ENV) => {
  if (!url) throw new Error('DATABASE_URL is required');
  if (nodeEnv === 'production') throw new Error('Refusing to run against NODE_ENV=production');
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run: the database host "${host}" is not local`);
  }
};

import morgan from 'morgan';

const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

const colorMethod = (method: string) => {
  switch (method) {
    case 'GET':
      return colors.green;
    case 'POST':
      return colors.blue;
    case 'PUT':
      return colors.yellow;
    case 'PATCH':
      return colors.magenta;
    case 'DELETE':
      return colors.red;
    default:
      return colors.gray;
  }
};

morgan.token('colored-method', req => {
  const method = req.method ?? '';
  return `${colorMethod(method)}${method}${colors.reset}`;
});

morgan.token('colored-status', (_req, res) => {
  const status = res.statusCode ?? 0;
  if (status >= 500) {
    return `${colors.red}${status}${colors.reset}`;
  }
  if (status >= 400) {
    return `${colors.yellow}${status}${colors.reset}`;
  }
  if (status >= 300) {
    return `${colors.blue}${status}${colors.reset}`;
  }
  return `${colors.green}${status}${colors.reset}`;
});

// Build the morgan middleware
export const morganMiddleware = morgan((tokens, req, res) => {
  const method = tokens['colored-method'](req, res);
  const url = tokens.url(req, res);
  const status = tokens['colored-status'](req, res);
  const time = tokens['response-time'](req, res);
  const length = tokens.res(req, res, 'content-length') ?? '-';
  return `${method} ${url} ${status} ${length} - ${time} ms`;
});

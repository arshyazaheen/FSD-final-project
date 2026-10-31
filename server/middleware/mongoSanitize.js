/**
 * Anti-NoSQL Injection Middleware
 * Recursively cleanses request body, query, and params by stripping keys
 * that begin with '$' or contain dots ('.'), preventing MongoDB operator injection.
 */
function clean(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(clean);
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = clean(obj[key]);
    }
  }

  return obj;
}

export function mongoSanitizer(req, res, next) {
  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
}

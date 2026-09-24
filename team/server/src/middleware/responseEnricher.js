function responseEnricher(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // RFC-shaped endpoints (e.g. the OAuth2 token endpoint) opt out so the body
    // stays exactly what the spec requires.
    if (res.locals.skipEnrich) {
      return originalJson(body);
    }
    if (body && typeof body === 'object') {
      if (!body.meta) body.meta = {};
      if (!body.meta.request_id) body.meta.request_id = req.requestId;
    }
    return originalJson(body);
  };
  next();
}

module.exports = { responseEnricher };
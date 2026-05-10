function responseEnricher(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (body && typeof body === 'object') {
      if (!body.meta) body.meta = {};
      if (!body.meta.request_id) body.meta.request_id = req.requestId;
    }
    return originalJson(body);
  };
  next();
}

module.exports = { responseEnricher };
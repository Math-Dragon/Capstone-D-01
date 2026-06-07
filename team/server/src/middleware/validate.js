function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.body)   req.body   = schemas.body.parse(req.body);
      if (schemas.query)  req.query  = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
      }
      next(err);
    }
  };
}

module.exports = { validate };

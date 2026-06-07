const packageConfig = require('./package.json').jest;

module.exports = {
  ...packageConfig,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

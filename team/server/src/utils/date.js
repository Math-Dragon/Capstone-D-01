function pad(value) {
  return String(value).padStart(2, '0');
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return [
      value.getUTCFullYear(),
      pad(value.getUTCMonth() + 1),
      pad(value.getUTCDate()),
    ].join('-');
  }
  return String(value).slice(0, 10);
}

module.exports = { normalizeDate, pad };

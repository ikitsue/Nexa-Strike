const handleRouteError = (res, context, error) => {
  console.error(`${context} failed`, {
    name: error?.name,
    code: error?.code,
  });
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = handleRouteError;

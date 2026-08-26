export const notFoundHandler = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ message: err.message });
  }

  const payload = {
    message: err.message || "Internal server error",
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

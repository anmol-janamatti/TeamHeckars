/**
 * Standardized API response helpers.
 */

export const success = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const error = (res, message, statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
  });
};

export const created = (res, message, data = null) => {
  return success(res, message, data, 201);
};

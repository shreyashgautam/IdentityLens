/**
 * Standard API Response Envelope Helpers
 * Conforms to docs/api-contract.md Sections 5 & 13
 */

export const successResponse = (res, data, { status = 200, pagination, meta = {} } = {}) => {
  const response = {
    data,
    meta: {
      request_id: res.req?.id,
      ...meta
    }
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(status).json(response);
};

export const errorResponse = (res, { status = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = null, req = null }) => {
  const errorObj = {
    code,
    message,
    request_id: req?.id || res.req?.id
  };

  if (details && Array.isArray(details) && details.length > 0) {
    errorObj.details = details;
  }

  return res.status(status).json({
    error: errorObj
  });
};

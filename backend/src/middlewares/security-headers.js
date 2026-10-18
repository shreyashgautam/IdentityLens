/**
 * Security Headers Middleware
 * Conforms to docs/api-contract.md Section 10 & security/secure-development.md Section 9.5
 * Enforces defense-in-depth HTTP security response headers.
 */
export const securityHeadersMiddleware = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by denying framing
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filtering protection in legacy browsers
  res.setHeader('X-XSS-Protection', '0');

  // Control referrer information sent in requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict-Transport-Security (HSTS) - enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
};

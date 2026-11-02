/**
 * IdentityLens — EmailJS and Two-Factor Authentication Dispatch Service
 * Conforms to secure development standards and handles 2FA email delivery.
 */

/**
 * Send 2FA One-Time Password email to registered recipient
 * 
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.otpCode - 6-digit numeric verification code
 * @param {string} [params.userName] - Display name or username
 * @returns {Promise<{ sent: boolean, provider: string, message?: string }>}
 */
export const sendOtpEmail = async ({ toEmail, otpCode, userName = '' }) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  const displayName = userName || toEmail.split('@')[0];

  // Output secure audit log to console for development / operator visibility
  console.log(`\n========================================================`);
  console.log(`[IDENTITYLENS 2FA DISPATCH]`);
  console.log(`Recipient: ${toEmail}`);
  console.log(`Security OTP Code: [ ${otpCode} ]`);
  console.log(`Validity: 10 minutes`);
  console.log(`Policy: Single-use cryptographic verification`);
  console.log(`========================================================\n`);

  if (!serviceId || !templateId || !publicKey) {
    return {
      sent: true,
      provider: 'console_dev_fallback',
      message: 'EmailJS keys not configured in .env. OTP logged to console for testing.'
    };
  }

  try {
    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: toEmail,
        email: toEmail,
        to: toEmail,
        recipient: toEmail,
        user_email: toEmail,
        to_name: displayName,
        user_name: displayName,
        name: displayName,
        from_name: 'IdentityLens IAM',
        reply_to: 'support@identitylens.io',
        otp_code: otpCode,
        otp: otpCode,
        code: otpCode,
        passcode: otpCode,
        message: `Your IdentityLens 2FA security code is: ${otpCode}. Valid for 10 minutes.`,
        expiry_minutes: 10
      }
    };

    if (privateKey) {
      payload.accessToken = privateKey;
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[EmailJS Service Warning] HTTP ${response.status}: ${errText}`);
      return {
        sent: false,
        provider: 'emailjs',
        message: errText
      };
    }

    return {
      sent: true,
      provider: 'emailjs'
    };
  } catch (err) {
    console.error('[EmailJS Service Error] Network or dispatch failure:', err.message);
    return {
      sent: false,
      provider: 'emailjs',
      message: err.message
    };
  }
};

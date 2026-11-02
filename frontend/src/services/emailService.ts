/**
 * EmailJS Helper Service for IdentityLens
 * Conforms to enterprise 2FA email notification standards.
 */

export interface EmailJsOtpParams {
  to_email: string;
  otp_code: string;
  user_name?: string;
  expiry_minutes?: number;
}

/**
 * Client-side EmailJS helper dispatch function
 * Directly sends from the user's browser, bypassing non-browser API blocks.
 */
export const sendOtpEmailClient = async ({
  to_email,
  otp_code,
  user_name = '',
  expiry_minutes = 10
}: EmailJsOtpParams): Promise<{ success: boolean; error?: string }> => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.info('[EmailJS Client] Client-side VITE_EMAILJS_* keys not configured. Backend handles dispatch.');
    return { success: true };
  }

  const name = user_name || to_email.split('@')[0];

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email,
          email: to_email,
          to: to_email,
          recipient: to_email,
          user_email: to_email,
          to_name: name,
          user_name: name,
          name,
          from_name: 'IdentityLens IAM',
          reply_to: 'support@identitylens.io',
          otp_code,
          otp: otp_code,
          code: otp_code,
          passcode: otp_code,
          message: `Your IdentityLens 2FA security code is: ${otp_code}. Valid for ${expiry_minutes} minutes.`,
          expiry_minutes
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[EmailJS Client Warning] HTTP ${res.status}: ${errText}`);
      return { success: false, error: errText };
    }

    console.info('[EmailJS Client Success] Security OTP email successfully dispatched from browser!');
    return { success: true };
  } catch (err) {
    console.error('[EmailJS Client Error] Failed to send email via client:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

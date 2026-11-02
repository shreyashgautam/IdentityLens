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
 * Useful for direct client-side notifications or custom triggers
 */
export const sendOtpEmailClient = async ({
  to_email,
  otp_code,
  user_name = '',
  expiry_minutes = 10
}: EmailJsOtpParams): Promise<boolean> => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    // Graceful fallback: backend already dispatches the email
    console.info('[EmailJS Client] Client-side VITE_EMAILJS_* keys not set. Backend dispatch active.');
    return true;
  }

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
          otp_code,
          user_name: user_name || to_email.split('@')[0],
          expiry_minutes
        }
      })
    });

    return res.ok;
  } catch (err) {
    console.error('[EmailJS Client Error] Failed to send email via client:', err);
    return false;
  }
};


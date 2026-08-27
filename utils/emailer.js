const axios = require('axios');

const sendVerificationEmail = async (toEmail, toName, verificationToken) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is missing in environment variables.");
  }
  if (!senderEmail) {
    throw new Error("SENDER_EMAIL is missing in environment variables.");
  }

  const verificationUrl = `${process.env.BASE_URL || 'https://infrastructure-report-microservice-auth.vercel.app'}/api/auth/verify?token=${verificationToken}`;

  const payload = {
    sender: {
      name: process.env.SENDER_NAME || "Infrastructure Report System",
      email: senderEmail.trim()
    },
    to: [
      {
        email: toEmail.trim(),
        name: toName
      }
    ],
    subject: "Verifikasi Akun - Infrastructure Report System",
    htmlContent: `<!DOCTYPE html><html><body><h3>Halo ${toName},</h3><p>Silakan klik tombol di bawah untuk memverifikasi akun Anda:</p><a href="${verificationUrl}" style="padding: 10px 18px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verifikasi Akun</a></body></html>`
  };

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey.trim(),
          'content-type': 'application/json'
        }
      }
    );

    console.log('[auth-service] Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[auth-service] Brevo Error Response:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengirim email verifikasi');
  }
};

module.exports = sendVerificationEmail;

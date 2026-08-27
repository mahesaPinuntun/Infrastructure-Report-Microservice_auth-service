const axios = require('axios');

const sendVerificationEmail = async (toEmail, toName, verificationToken) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is missing in environment variables.");
  }

  const verificationUrl = `${process.env.BASE_URL || 'https://infrastructure-report-microservice-auth.vercel.app'}/api/auth/verify?token=${verificationToken}`;

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.SENDER_NAME || "Infrastructure Report System",
          email: process.env.SENDER_EMAIL
        },
        to: [{ email: toEmail, name: toName }],
        subject: "Verifikasi Akun - Infrastructure Report System",
        htmlContent: `
          <h3>Halo ${toName},</h3>
          <p>Silakan klik tombol di bawah untuk memverifikasi akun Anda:</p>
          <a href="${verificationUrl}" style="padding: 10px 18px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verifikasi Akun</a>
        `
      },
      {
        headers: {
          'api-key': apiKey.trim(), // ✅ Wajib 'api-key' tanpa spasi ekstra
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('[auth-service] Brevo Error Detail:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Gagal mengirim email verifikasi');
  }
};

module.exports = sendVerificationEmail;

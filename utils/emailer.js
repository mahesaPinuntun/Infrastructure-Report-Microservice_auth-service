const sendVerificationEmail = async (email, name, token) => {
  const verifyLink = `${process.env.CLIENT_VERIFY_URL}?token=${token}`;

  const payload = {
    sender: {
      name: process.env.SENDER_NAME || "Sistem Laporan Infrastruktur",
      email: process.env.SENDER_EMAIL || "mapupi.ganteng@gmail.com"
    },
    to: [
      {
        email: email,
        name: name
      }
    ],
    subject: "Verifikasi Akun Sistem Laporan Infrastruktur",
    htmlContent: `
      <html>
        <head></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Halo, ${name}!</h2>
          <p>Terima kasih telah mendaftar di Sistem Laporan Infrastruktur.</p>
          <p>Silakan verifikasi akun Anda dengan menekan tombol di bawah ini:</p>
          <p>
            <a href="${verifyLink}" style="padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verifikasi Akun Saya</a>
          </p>
          <p>Atau salin link berikut ke browser Anda:</p>
          <p><a href="${verifyLink}">${verifyLink}</a></p>
          <br>
          <p><small>Link ini berlaku selama 24 jam.</small></p>
        </body>
      </html>
    `
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API Error Response:', data);
    } else {
      console.log(`Verification email successfully sent to ${email}. Message ID:`, data.messageId);
    }
  } catch (error) {
    console.error('Failed to send verification email via Brevo REST API:', error.message);
  }
};

module.exports = sendVerificationEmail;
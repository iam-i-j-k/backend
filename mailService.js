import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (to, token) => {
  const verificationLink = `https://skillswap2.vercel.app/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify Your SkillSwap Account",
    html: `
      <h2>Welcome to SkillSwap 👋</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}" target="_blank">Verify Email</a>
      <p>This link will expire in 1 hour.</p>
    `,
  });
};

import nodemailer from 'nodemailer';

export async function sendVerificationEmail(to, code) {
  // Create a transporter using your email service
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or another provider
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS  // your email password or app-specific password
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'EduMood Verification Code',
    text: `Your verification code is: ${code}`
  };

  return transporter.sendMail(mailOptions);
}

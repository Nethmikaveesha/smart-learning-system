import nodemailer from "nodemailer";

/**
 * Returns true when SMTP env vars are configured for outbound mail.
 */
export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

/**
 * Send an email when SMTP is configured.
 * Returns { sent: true } or { sent: false, reason }.
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

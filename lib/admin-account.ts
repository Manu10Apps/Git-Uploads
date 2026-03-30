import crypto from 'node:crypto';

function getBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  return (configured || 'http://localhost:3000').replace(/\/$/, '');
}

async function sendMail(to: string, subject: string, text: string, html: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@intambwemedia.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[admin-email] SMTP not configured. Email was not sent.');
    console.info('[admin-email] To:', to);
    console.info('[admin-email] Subject:', subject);
    console.info('[admin-email] Text:', text);
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function buildVerificationUrl(token: string) {
  return `${getBaseUrl()}/admin/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetUrl(token: string) {
  return `${getBaseUrl()}/admin/login?mode=reset&token=${encodeURIComponent(token)}`;
}

export async function sendAdminVerificationEmail(email: string, name: string, token: string) {
  const verificationUrl = buildVerificationUrl(token);
  const subject = 'Verify your admin account email';
  const text = `Hello ${name},\n\nClick this link to verify your admin account:\n${verificationUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `
    <p>Hello ${name},</p>
    <p>Click the button below to verify your admin account email:</p>
    <p><a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
    <p>If the button does not work, use this link:</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
  `;

  await sendMail(email, subject, text, html);
}

export async function sendAdminPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = buildPasswordResetUrl(token);
  const subject = 'Reset your admin account password';
  const text = `Hello ${name},\n\nClick this link to set a new password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `
    <p>Hello ${name},</p>
    <p>Click the button below to set a new password:</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:6px;">Set New Password</a></p>
    <p>If the button does not work, use this link:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
  `;

  await sendMail(email, subject, text, html);
}

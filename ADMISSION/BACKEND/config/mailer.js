import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; 

dotenv.config(); 
let cachedTransporter = null;

const getRequiredEmailConfig = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log("Attempting login with:", process.env.EMAIL_USER); // Add this
  

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be configured in environment variables.');
  }

  return { user, pass };
};

export const getGmailTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const { user, pass } = getRequiredEmailConfig();

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
};

export const sendMailWithGmail = async ({ to, subject, text, html, attachments = [] }) => {
  const { user } = getRequiredEmailConfig();
  const transporter = getGmailTransporter();

  return transporter.sendMail({
    from: user,
    to,
    subject,
    text,
    html,
    attachments,
  });
};

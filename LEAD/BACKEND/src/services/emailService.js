import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendRealEmail = async ({ to, subject, content }) => {
  console.log("EMAIL USER:", process.env.EMAIL_USER);
  console.log("SENDING TO:", to);

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: content,
  });
};
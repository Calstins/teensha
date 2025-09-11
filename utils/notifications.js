// utils/notifications.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email send error:', error);
  }
};

export const sendChallengeNotification = async (teens, challenge, type) => {
  const templates = {
    launch: {
      subject: `🚀 ${challenge.theme} Challenge is Live!`,
      html: `
        <h2>New Monthly Challenge is Here!</h2>
        <p>Hi there! The <strong>${challenge.theme}</strong> challenge is now live and ready for you to explore.</p>
        <p>This month's focus: ${challenge.instructions}</p>
        <p>Don't forget to check out the special badge available for this challenge!</p>
        <p>Happy challenging! 🌟</p>
      `,
    },
    midMonth: {
      subject: `⏰ Keep Going! ${challenge.theme} Challenge`,
      html: `
        <h2>You're Doing Great!</h2>
        <p>Hey champion! Just a gentle reminder about the <strong>${challenge.theme}</strong> challenge.</p>
        <p>You still have time to complete your tasks and earn your badge. Every step counts!</p>
        <p>Keep up the amazing work! 💪</p>
      `,
    },
    lastWeek: {
      subject: `🏁 Final Week: ${challenge.theme} Challenge`,
      html: `
        <h2>Final Sprint Time!</h2>
        <p>This is it - the final week of the <strong>${challenge.theme}</strong> challenge!</p>
        <p>Don't let this opportunity slip away. Complete your remaining tasks and earn that badge!</p>
        <p>Finish strong! 🏆</p>
      `,
    },
  };

  const template = templates[type];

  for (const teen of teens) {
    await sendEmail(teen.email, template.subject, template.html);
  }
};

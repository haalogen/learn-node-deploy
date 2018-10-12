const nodemailer = require('nodemailer'); // Does email sending
const pug = require('pug');
const juice = require('juice'); // Inlines styles (from <style> tag to element's "style" attribute)
const htmlToText = require('html-to-text'); // Converts html to formatted text
const promisify = require('es6-promisify'); // Callback-based API -> Promise-based API

const generateHTML = (filename, options = {}) => {
  // "__dirname" === Current directory (where this file lays)
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
  inlined = juice(html);
  return inlined;
};

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  }
});

exports.send = async (options) => {
  const html = generateHTML(options.filename, options);
  const text = htmlToText.fromString(html);
  const mailOptions = {
    from: 'Stan <noreply@example.com>',
    to: options.user.email,
    subject: options.subject,
    html,
    text,
  };

  // promisify(func, bindingObject)
  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions)
}
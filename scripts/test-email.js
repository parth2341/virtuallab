const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testSMTP() {
  console.log('--- SMTP Diagnostic Tool ---');
  console.log('Host:', process.env.SMTP_HOST || 'smtp.gmail.com (default)');
  console.log('Port:', process.env.SMTP_PORT || '465 (default)');
  console.log('User:', process.env.SMTP_USER);
  console.log('From:', process.env.SMTP_FROM);
  
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
    console.error('\n❌ ERROR: SMTP_USER is not configured or is using a placeholder.');
    return;
  }
  
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'xxxx-xxxx-xxxx-xxxx') {
    console.error('\n❌ ERROR: SMTP_PASS is not configured or is using a placeholder.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log('\nTesting connection...');
  try {
    await transporter.verify();
    console.log('✅ Success: SMTP connection is valid!');
    
    console.log('\nSending test email...');
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to self
      subject: 'SMTP Diagnostic Test - Virtual Lab',
      text: 'If you receive this, your SMTP configuration is working correctly!',
    });
    console.log('✅ Success: Test email sent to ' + process.env.SMTP_USER);
  } catch (error) {
    console.error('\n❌ SMTP Error:', error.message);
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 TIP: Check your Gmail App Password. It must be 16 characters (no spaces).');
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 TIP: Check your SMTP_PORT. Gmail usually uses 465 (secure) or 587.');
    }
  }
}

testSMTP();

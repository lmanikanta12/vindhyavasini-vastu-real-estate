import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { startReminders } from './services/reminders.js';
import { emailMode } from './services/email.js';
import { getSettings } from './models/Setting.js';

async function main() {
  await connectDB();
  await getSettings();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`\nVindhyavasini Vastu and Real Estate API running on http://localhost:${env.port}`);
    console.log(`  Email: ${emailMode()}${emailMode() === 'console' ? '  (no SMTP set: emails are printed here)' : ''}`);
    console.log(`  Payments: ${env.paymentMode}${env.paymentMode === 'demo' ? '  (no Razorpay keys: demo mode)' : ''}\n`);
  });
  startReminders();
}

main().catch((err) => {
  console.error('Could not start the server:', err.message);
  if (/ECONNREFUSED|ServerSelection/i.test(err.message)) console.error('Is MongoDB running? Check MONGODB_URI in backend/.env');
  process.exit(1);
});

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

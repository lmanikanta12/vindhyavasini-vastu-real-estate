import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { templates } from './emailTemplates.js';
import { sendEmail } from './email.js';
import { isValidId } from '../utils/helpers.js';

async function resolveUser(u) {
  if (!u) return null;
  if (typeof u === 'object' && u.email !== undefined) return u;
  if (!isValidId(String(u))) return null;
  return User.findById(u);
}

export function mail(to, template, data) {
  if (!to) return Promise.resolve();
  try {
    const content = templates[template](data);
    return sendEmail({ to, ...content }).catch((e) => console.error('[mail]', e.message));
  } catch (e) {
    console.error(`[mail] template ${template} failed:`, e.message);
    return Promise.resolve();
  }
}

export async function notify(userLike, { title, text, to = '', type = 'info' }, { email, critical = false } = {}) {
  try {
    const user = await resolveUser(userLike);
    if (!user || user.status === 'Inactive') return;
    await Notification.create({ userId: user._id, title, text, to, type });
    if (email && user.email && (critical || user.prefs?.email !== false)) {
      void mail(user.email, email.template, { name: user.name, ...email.data });
    }
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}

export async function notifyAdmins(payload, channels) {
  const admins = await User.find({ role: 'admin', status: 'Active' });
  await Promise.all(admins.map((a) => notify(a, payload, channels)));
}

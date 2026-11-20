import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity(actor, { action, entityType = '', entity, entityRef = '', summary = '', req } = {}) {
  try {
    await ActivityLog.create({
      actorId: actor?._id || null,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'system',
      action,
      entityType,
      entityId: entity?._id ? String(entity._id) : entity ? String(entity) : '',
      entityRef: entityRef || entity?.ref || '',
      summary: String(summary).slice(0, 300),
      ip: req?.ip || '',
    });
  } catch (e) {
    console.error('[activity]', e.message);
  }
}

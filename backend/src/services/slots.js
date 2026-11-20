import { Consultation } from '../models/Consultation.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { User } from '../models/User.js';
import { conflict, bad } from '../utils/ApiError.js';
import { isISODate, isTime, isPastSlot } from '../utils/helpers.js';

const ACTIVE_CONSULT = ['Requested', 'Confirmed'];
const ACTIVE_VISIT = ['Requested', 'Scheduled'];

export async function assertConsultantFree(consultant, date, time, { ignoreId } = {}) {
  if (!isISODate(date) || !isTime(time)) throw bad('Please choose a valid date and time.');
  if (isPastSlot(date, time)) throw bad('Please choose a time in the future.');
  const av = consultant.availability || {};
  const day = new Date(`${date}T00:00:00`).getDay();
  if (av.days?.length && !av.days.includes(day)) throw conflict(`${consultant.name} is not available on this day.`);
  if (av.blocked?.includes(date)) throw conflict(`${consultant.name} is not available on this date.`);
  if (av.slots?.length && !av.slots.includes(time)) throw conflict('This time is not offered by the consultant.');
  const q = { consultantId: consultant._id, date, time, status: { $in: ACTIVE_CONSULT } };
  if (ignoreId) q._id = { $ne: ignoreId };
  if (await Consultation.exists(q)) throw conflict('This slot has just been booked. Please pick another time.');
}

export const VISIT_SLOTS = ['09:30', '11:00', '12:30', '15:00', '16:30'];

export const agentAvailability = (agent) => ({
  days: agent?.availability?.days ?? [1, 2, 3, 4, 5, 6],
  slots: agent?.availability?.slots?.length ? agent.availability.slots : VISIT_SLOTS,
  blocked: agent?.availability?.blocked ?? [],
});

export function agentScheduleProblem(agent, date, time) {
  const av = agentAvailability(agent);
  const day = new Date(`${date}T00:00:00`).getDay();
  if (!av.days.includes(day)) return `${agent?.name || 'The agent'} does not work on this day.`;
  if (av.blocked.includes(date)) return `${agent?.name || 'The agent'} is not available on this date.`;
  if (time && !av.slots.includes(time)) return `${agent?.name || 'The agent'} does not take visits at this time.`;
  return '';
}

export async function assertAgentFree(agentId, date, time, { ignoreId } = {}) {
  if (!isISODate(date) || !isTime(time)) throw bad('Please choose a valid date and time.');
  if (isPastSlot(date, time)) throw bad('Please choose a time in the future.');
  const agent = await User.findById(agentId, 'name role availability');
  const why = agent?.role === 'agent' ? agentScheduleProblem(agent, date, time) : '';
  if (why) throw conflict(why);
  const q = { agentId, date, time, status: { $in: ACTIVE_VISIT } };
  if (ignoreId) q._id = { $ne: ignoreId };
  if (await SiteVisit.exists(q)) throw conflict('The agent already has a visit at this time. Please pick another slot.');
}

export async function takenSlots(consultantId, date) {
  const rows = await Consultation.find({ consultantId, date, status: { $in: ACTIVE_CONSULT } }, 'time');
  return rows.map((r) => r.time);
}

export async function takenVisitSlots(agentId, date) {
  const rows = await SiteVisit.find({ agentId, date, status: { $in: ACTIVE_VISIT } }, 'time');
  return rows.map((r) => r.time);
}

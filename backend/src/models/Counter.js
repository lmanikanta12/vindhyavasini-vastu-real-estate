import mongoose from 'mongoose';

const schema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', schema);

const PREFIX = { property: ['VE', 1000], enquiry: ['EQ', 5000], visit: ['SV', 4000], consultation: ['VC', 2000], payment: ['RCPT', 3000], construction: ['CN', 7000] };

export async function nextRef(kind) {
  const [prefix, base] = PREFIX[kind];
  const c = await Counter.findOneAndUpdate({ _id: kind }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return `${prefix}-${base + c.seq}`;
}

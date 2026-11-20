import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { badGateway } from '../utils/ApiError.js';

export const storageMode = () => (env.cloudinary.configured ? 'cloudinary' : 'local');

async function toCloudinary(buf, mime) {
  const c = env.cloudinary;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const toSign = `folder=${c.folder}&public_id=${publicId}&timestamp=${timestamp}${c.apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  const form = new FormData();
  form.append('file', `data:${mime};base64,${buf.toString('base64')}`);
  form.append('api_key', c.apiKey);
  form.append('timestamp', timestamp);
  form.append('folder', c.folder);
  form.append('public_id', publicId);
  form.append('signature', signature);
  let res;
  try {
    res = await fetch(`${c.apiBase}/v1_1/${c.cloudName}/auto/upload`, { method: 'POST', body: form });
  } catch {
    throw badGateway('Photo storage could not be reached. Please try again.');
  }
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.secure_url) throw badGateway(out?.error?.message ? `Photo storage refused the file: ${out.error.message}` : 'Photo storage refused the file.');
  return out.secure_url;
}

export async function saveFile(buf, mime, ext, uploadDir) {
  if (env.cloudinary.configured) return toCloudinary(buf, mime);
  const file = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, file), buf);
  return `/uploads/${file}`;
}

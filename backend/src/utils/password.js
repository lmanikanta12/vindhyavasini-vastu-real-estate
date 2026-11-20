import bcrypt from 'bcryptjs';
import { bad } from './ApiError.js';

export const hashPw = (pw) => bcrypt.hash(pw, 11);

export const validatePassword = (pw) => {
  if (typeof pw !== 'string' || pw.length < 8) throw bad('Password must be at least 8 characters.');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw bad('Password must contain at least one letter and one number.');
  if (pw.length > 72) throw bad('Password is too long.');
};

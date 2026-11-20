import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { Service } from '../models/Service.js';
import { isValidId } from '../utils/helpers.js';

export const userName = async (id) => (id && isValidId(String(id)) ? (await User.findById(id, 'name'))?.name : '') || '';
export const propTitle = async (id) => (id && isValidId(String(id)) ? (await Property.findById(id, 'title'))?.title : '') || '';
export const serviceName = async (id) => (id && isValidId(String(id)) ? (await Service.findById(id, 'name'))?.name : '') || 'Consultation';

// validators/user.js
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  bio: z.string().max(300).optional(),
  skills: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const profileUpdateSchema = z.object({
  username: z.string().min(3).optional(),
  bio: z.string().max(300).optional(),
  skills: z.array(z.string()).optional(),
});

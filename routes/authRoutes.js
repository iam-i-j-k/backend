import express from 'express';
import { register, login, updateProfile, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validate } from '../utils/validate.js';
import { registerSchema, loginSchema, profileUpdateSchema } from '../validators/user.js';
import { auth } from '../middleware/auth.js';


const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.put('/profile', auth, validate(profileUpdateSchema), updateProfile);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
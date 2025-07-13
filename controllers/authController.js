import { registerService, loginService, updateProfileService, verifyEmailService } from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const result = await registerService(req.body);

    // Emit real-time event for new user registration
    const io = req.app.get('io');
    if (io && result.user) {
      io.emit('userRegistered', {
        _id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        skills: result.user.skills,
        bio: result.user.bio,
      });
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginService(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const result = await updateProfileService(req.userId, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await verifyEmailService(token);
    if (result.success) {
      return res.status(200).json({ message: 'Email verified successfully.' });
    } else if (result.alreadyVerified) {
      return res.status(200).json({ message: 'Email already verified.' });
    } else {
      return res.status(400).json({ message: result.message || 'Invalid or expired token.' });
    }
  } catch (err) {
    next(err);
  }
};
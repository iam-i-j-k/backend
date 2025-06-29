import { registerService, loginService, updateProfileService } from '../services/authService.js';

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
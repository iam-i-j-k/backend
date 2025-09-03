import { registerService, loginService, updateProfileService, verifyEmailService, forgotPasswordService, resetPasswordService } from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const result = await registerService(req.body);

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
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await loginService(req.body);
    res.status(200).json(result);
  } catch (err) {
    if (err.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (err.message === 'Please verify your email before logging in.') {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }
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

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordService(email);
    if (result.success) {
      res.status(200).json({ message: 'Password reset email sent.' });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const result = await resetPasswordService(token, password);
    if (result.success) {
      res.status(200).json({ message: 'Password reset successful.' });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (err) {
    next(err);
  }
};
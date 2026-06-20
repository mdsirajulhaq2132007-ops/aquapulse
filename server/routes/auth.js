const express = require('express');
const router = express.Router();
const { register, login, refresh, getMe, getUsers, updateUser } = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/register', protect, requireRole('admin'), register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.get('/users', protect, requireRole('admin'), getUsers);
router.patch('/users/:id', protect, requireRole('admin'), updateUser);

module.exports = router;

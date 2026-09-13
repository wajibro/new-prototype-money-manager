import express from 'express';
import { showAuthPage, login, logout } from '../controllers/authController.js';

const router = express.Router();

router.get('/', showAuthPage);
router.post('/login', login);
router.all('/logout', logout);

export default router;
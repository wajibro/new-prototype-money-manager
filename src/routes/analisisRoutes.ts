import express from 'express';
import { showAnalisisPage } from '../controllers/analisisController.js';
import { loginRequired } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', loginRequired, showAnalisisPage);

export default router;
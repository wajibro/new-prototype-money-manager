import express from 'express';
import { showHistoriPage, updateHistori, hapusHistori } from '../controllers/historiController.js';
import { loginRequired } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', loginRequired, showHistoriPage);
router.post('/update/:id', loginRequired, updateHistori);
router.post('/hapus/:id', loginRequired, hapusHistori);

export default router;
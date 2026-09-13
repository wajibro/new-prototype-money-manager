import express from 'express';
import { showAkunPage, tambahAkun, updateAkun, prosesTransfer, hapusAkun } from '../controllers/akunController.js';
import { loginRequired } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', loginRequired, showAkunPage);
router.post('/tambah', loginRequired, tambahAkun);
router.post('/update/:id', loginRequired, updateAkun);
router.post('/transfer/:id', loginRequired, prosesTransfer);
router.post('/hapus/:id', loginRequired, hapusAkun);

export default router;
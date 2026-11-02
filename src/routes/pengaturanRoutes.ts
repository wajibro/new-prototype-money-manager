import express from 'express';
import {
    showPengaturanPage,
    tambahPrioritas, updatePrioritas, hapusPrioritas,
    tambahKategori, updateKategori, hapusKategori
} from '../controllers/pengaturanController.js';
import { loginRequired } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', loginRequired, showPengaturanPage);

router.post('/prioritas/tambah', loginRequired, tambahPrioritas);
router.post('/prioritas/update/:id', loginRequired, updatePrioritas);
router.post('/prioritas/hapus/:id', loginRequired, hapusPrioritas);

router.post('/kategori/tambah', loginRequired, tambahKategori);
router.post('/kategori/update/:id', loginRequired, updateKategori);
router.post('/kategori/hapus/:id', loginRequired, hapusKategori);

export default router;
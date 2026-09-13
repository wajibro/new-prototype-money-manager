import express from 'express';
import { showKategoriPage, simpanTransaksi, tambahKategori } from '../controllers/kategoriController';
import { loginRequired } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', loginRequired, showKategoriPage);
router.post('/simpan/:type', loginRequired, simpanTransaksi);
router.post('/tambah-kategori/:type', loginRequired, tambahKategori);

export default router;
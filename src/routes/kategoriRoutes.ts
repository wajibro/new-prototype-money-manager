import express from 'express';
import { showKategoriPage, simpanTransaksi } from '../controllers/kategoriController';
import { loginRequired } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', loginRequired, showKategoriPage);
router.post('/simpan/:type', loginRequired, simpanTransaksi);

// Redirect route lama ke halaman pengaturan
router.post('/tambah-kategori/:type', loginRequired, (req, res) => {
    res.redirect('/pengaturan?tab=kategori');
});

export default router;
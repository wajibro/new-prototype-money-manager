import type { Request, Response, NextFunction } from 'express';
import { selectTable, insertTable, updateTable, deleteTable } from '../services/supabaseService.js';
import { randomUUID } from 'crypto';

const formatRupiah = (num: number): string =>
    `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getSummary = async () => {
    const akunQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
    let totalSaldoNum = 0;
    akunQuery.forEach(a => totalSaldoNum += parseFloat(a.total_akun || 0));

    const bulanIni = new Date().toISOString().slice(0, 7);
    const recap = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni });

    return {
        totalSaldo: formatRupiah(totalSaldoNum),
        totalPemasukan: formatRupiah(parseFloat(recap[0]?.total_pemasukan || 0)),
        totalPengeluaran: formatRupiah(parseFloat(recap[0]?.total_pengeluaran || 0))
    };
};

export const showPengaturanPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const tabAktif = (req.query.tab as string) || 'prioritas';
        const message = (req.query.message as string) || '';
        const editPrioritasId = req.query.edit_prioritas_id as string;
        const editKategoriId = req.query.edit_kategori_id as string;

        const summary = await getSummary();
        const prioritas = await selectTable('prioritas', { order1: 'id_prioritas' });
        const kategori = await selectTable('kategori', { order1: 'nama_kategori' });

        let editPrioritas = null;
        if (editPrioritasId) {
            const q = await selectTable('prioritas', { eqCol: 'id_prioritas', eqRow: editPrioritasId });
            if (q.length > 0) editPrioritas = q[0];
        }
        let editKategori = null;
        if (editKategoriId) {
            const q = await selectTable('kategori', { eqCol: 'id_kategori', eqRow: editKategoriId });
            if (q.length > 0) editKategori = q[0];
        }

        res.render('pengaturan', {
            ...summary, prioritas, kategori, tabAktif, message, editPrioritas, editKategori
        });
        return;
    } catch (error) { next(error); return; }
};

/* ═══════════ CRUD PRIORITAS ═══════════ */

export const tambahPrioritas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { input_nama_prioritas_baru, input_jenis_prioritas_baru } = req.body;
        const nama = String(input_nama_prioritas_baru || '').trim();
        if (!nama) {
            res.redirect('/pengaturan?tab=prioritas&message=Nama prioritas wajib diisi');
            return;
        }
        const namaPrioritas = nama.charAt(0).toUpperCase() + nama.slice(1);
        const jenis = input_jenis_prioritas_baru === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran';

        const cek = await selectTable('prioritas', { eqCol: 'nama_prioritas', eqRow: namaPrioritas });
        if (cek.length > 0) {
            res.redirect('/pengaturan?tab=prioritas&message=Prioritas dengan nama tersebut sudah ada');
            return;
        }

        await insertTable('prioritas', { nama_prioritas: namaPrioritas, jenis });
        res.redirect('/pengaturan?tab=prioritas');
        return;
    } catch (error) { next(error); return; }
};

export const updatePrioritas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { input_nama_prioritas_baru, input_jenis_prioritas_baru } = req.body;
        const nama = String(input_nama_prioritas_baru || '').trim();
        const namaPrioritas = nama.charAt(0).toUpperCase() + nama.slice(1);
        const jenis = input_jenis_prioritas_baru === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran';

        const cek = await selectTable('prioritas', { eqCol: 'nama_prioritas', eqRow: namaPrioritas });
        if (cek.some((p: any) => String(p.id_prioritas) !== String(id))) {
            res.redirect(`/pengaturan?tab=prioritas&edit_prioritas_id=${id}&message=Nama prioritas sudah dipakai`);
            return;
        }

        await updateTable('prioritas', { nama_prioritas: namaPrioritas, jenis }, 'id_prioritas', id);
        res.redirect('/pengaturan?tab=prioritas');
        return;
    } catch (error) { next(error); return; }
};

export const hapusPrioritas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const dipakai = await selectTable('data_historis', {
            select: 'id_histori', eqCol: 'id_prioritas', eqRow: id
        });
        if (dipakai.length > 0) {
            res.redirect('/pengaturan?tab=prioritas&message=Prioritas masih dipakai pada data histori, tidak bisa dihapus');
            return;
        }
        await deleteTable('prioritas', 'id_prioritas', id);
        res.redirect('/pengaturan?tab=prioritas');
        return;
    } catch (error) { next(error); return; }
};

/* ═══════════ CRUD KATEGORI (id text PK) ═══════════ */

export const tambahKategori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { input_nama_kategori_baru, input_id_kategori_baru } = req.body;
        const nama = String(input_nama_kategori_baru || '').trim();
        if (!nama) {
            res.redirect('/pengaturan?tab=kategori&message=Nama kategori wajib diisi');
            return;
        }
        const namaKategori = nama.charAt(0).toUpperCase() + nama.slice(1);

        // ID: pakai input user kalau ada, kalau tidak auto-generate
        let idKategori = String(input_id_kategori_baru || '').trim().toUpperCase();
        if (!idKategori) {
            idKategori = 'K' + randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
        }

        const cekId = await selectTable('kategori', { eqCol: 'id_kategori', eqRow: idKategori });
        if (cekId.length > 0) {
            res.redirect('/pengaturan?tab=kategori&message=ID kategori sudah dipakai');
            return;
        }
        const cekNama = await selectTable('kategori', { eqCol: 'nama_kategori', eqRow: namaKategori });
        if (cekNama.length > 0) {
            res.redirect('/pengaturan?tab=kategori&message=Nama kategori sudah ada');
            return;
        }

        await insertTable('kategori', { id_kategori: idKategori, nama_kategori: namaKategori });
        res.redirect('/pengaturan?tab=kategori');
        return;
    } catch (error) { next(error); return; }
};

export const updateKategori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { input_nama_kategori_baru } = req.body;
        const nama = String(input_nama_kategori_baru || '').trim();
        const namaKategori = nama.charAt(0).toUpperCase() + nama.slice(1);

        const cek = await selectTable('kategori', { eqCol: 'nama_kategori', eqRow: namaKategori });
        if (cek.some((k: any) => String(k.id_kategori) !== String(id))) {
            res.redirect(`/pengaturan?tab=kategori&edit_kategori_id=${id}&message=Nama kategori sudah dipakai`);
            return;
        }

        // Ambil nama lama untuk sinkronisasi sub_kategori (agar view lama tidak stale)
        const oldData = await selectTable('kategori', { eqCol: 'id_kategori', eqRow: id });
        const oldNama = oldData[0]?.nama_kategori as string | undefined;

        await updateTable('kategori', { nama_kategori: namaKategori }, 'id_kategori', id);

        // Sinkronisasi sub_kategori di histori (legacy field) — best effort
        if (oldNama && oldNama !== namaKategori) {
            try {
                await updateTable('data_historis', { sub_kategori: namaKategori }, 'sub_kategori', oldNama);
            } catch (_) { /* skip */ }
        }

        res.redirect('/pengaturan?tab=kategori');
        return;
    } catch (error) { next(error); return; }
};

export const hapusKategori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const dipakai = await selectTable('data_historis', {
            select: 'id_histori', eqCol: 'id_kategori', eqRow: id
        });
        if (dipakai.length > 0) {
            res.redirect('/pengaturan?tab=kategori&message=Kategori masih dipakai pada data histori, tidak bisa dihapus');
            return;
        }
        await deleteTable('kategori', 'id_kategori', id);
        res.redirect('/pengaturan?tab=kategori');
        return;
    } catch (error) { next(error); return; }
};
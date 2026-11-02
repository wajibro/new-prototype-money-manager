import type { Request, Response, NextFunction } from "express";
import { selectTable, insertTable } from "../services/supabaseService.js";

const formatRupiah = (num: number): string =>
    `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const showKategoriPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const tabAktif = (req.query.tab as string) === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
        const message = (req.query.message as string) || '';

        const akunQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        akunQuery.forEach(a => totalSaldoNum += parseFloat(a.total_akun || 0));
        const totalSaldo = formatRupiah(totalSaldoNum);

        const bulanIni = new Date().toISOString().slice(0, 7);
        const recap = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni });
        const totalPengeluaran = formatRupiah(parseFloat(recap[0]?.total_pengeluaran || 0));
        const totalPemasukan = formatRupiah(parseFloat(recap[0]?.total_pemasukan || 0));

        const prioritas = await selectTable('prioritas', { order1: 'id_prioritas' });
        const kategori = await selectTable('kategori', { order1: 'nama_kategori' });
        const akunTabungan = await selectTable('akun_tabungan', { order1: 'id_akun' });

        res.render('kategori', {
            totalSaldo, totalPemasukan, totalPengeluaran,
            prioritas, kategori, akunTabungan, tabAktif, message
        });
        return;
    } catch (error) { next(error); return; }
};

export const simpanTransaksi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { type } = req.params;
        const {
            input_tanggal,
            input_prioritas,
            input_kategori,
            input_note,
            input_akun_tabungan,
            input_total_perubahan
        } = req.body;

        const totalPerubahan = parseFloat(input_total_perubahan || 0);

        if (!input_akun_tabungan) {
            res.redirect(`/kategori?tab=${type}&message=Akun tabungan tidak ditemukan`);
            return;
        }
        if (!input_prioritas) {
            res.redirect(`/kategori?tab=${type}&message=Prioritas wajib dipilih`);
            return;
        }
        if (!input_kategori) {
            res.redirect(`/kategori?tab=${type}&message=Kategori wajib dipilih`);
            return;
        }

        // Ambil nama_kategori untuk mengisi sub_kategori legacy
        const katQuery = await selectTable('kategori', { eqCol: 'id_kategori', eqRow: input_kategori });
        const namaKategori = katQuery[0]?.nama_kategori;
        if (!namaKategori) {
            res.redirect(`/kategori?tab=${type}&message=Kategori tidak ditemukan`);
            return;
        }

        const isPengeluaran = type === 'pengeluaran';

        await insertTable('data_historis', {
            tanggal: input_tanggal,
            id_akun_src: input_akun_tabungan,
            id_akun_target: null,
            jenis: isPengeluaran ? 'Pengeluaran' : 'Pemasukan',
            id_prioritas: input_prioritas,
            id_kategori: input_kategori,
            sub_kategori: namaKategori,   // legacy-compat untuk view lama
            note: String(input_note || '').trim() || null,
            perubahan: totalPerubahan
        });

        res.redirect(`/kategori?tab=${type}`);
        return;
    } catch (error) { next(error); return; }
};
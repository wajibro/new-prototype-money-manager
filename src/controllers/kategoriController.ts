import type { Request, Response, NextFunction } from "express";
import { selectTable, insertTable, updateTable } from "../services/supabaseService";
import { format, parse } from "path";
import { match } from "assert";

const formatRupiah = (num: number):string => {
    return `Rp ${num.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

export const showKategoriPage = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try {
        const tabAktif = (req.query.tab as string) || 'pengeluaran';
        const message = (req.query.message as string) || '';

        const akunTabunganQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        akunTabunganQuery.forEach(akun => totalSaldoNum += parseFloat(akun.total_akun || 0));
        const totalSaldo = formatRupiah(totalSaldoNum);

        const bulanIni = new Date().toISOString().slice(0, 7);

        const pengeluaranQuery = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni});
        const totalPengeluaran = formatRupiah(parseFloat(pengeluaranQuery[0]?.total_pengeluaran));

        const pemasukanQuery = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni});
        const totalPemasukan = formatRupiah(parseFloat(pemasukanQuery[0]?.total_pemasukan));

        const kategori = await selectTable('kategori', { order1: 'id_kategori' });
        const akunTabungan = await selectTable('akun_tabungan');

        res.render('kategori', {
            totalSaldo, totalPemasukan, totalPengeluaran, kategori, akunTabungan, tabAktif, message
        });
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const simpanTransaksi = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try{
        const { type } = req.params;
        const { input_tanggal, input_kategori, input_akun_tabungan, input_total_perubahan, input_sub_kategori } = req.body;

        const totalPerubahan = parseFloat(input_total_perubahan || 0);

        if (!input_akun_tabungan || input_akun_tabungan.length === 0){
            res.redirect(`/kategori?tab=${type}&message=Akun tabungan tidak ditemukan`);
            return;
        }

        const isPengeluaran = type === 'pengeluaran';
        const subKategori = input_sub_kategori === '' ? '-' : String(input_sub_kategori).trim();

        await insertTable('data_historis', {
            tanggal: input_tanggal,
            id_akun_src: input_akun_tabungan,
            id_akun_target: null,
            jenis: isPengeluaran ? 'Pengeluaran' : 'Pemasukan',
            id_kategori: input_kategori,
            sub_kategori: subKategori.charAt(0).toUpperCase() + subKategori.slice(1),
            perubahan: totalPerubahan
        });

        res.redirect(`/kategori?tab=${type}`);
        return;
    } catch (error){
        next(error);
        return;
    }
};

export const tambahKategori = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try {
        const { type } = req.params;
        const inputField = `input_kategori_${type}_baru`;
        const inputKategoriBaru = req.body[inputField];

        if(!inputKategoriBaru){
            res.redirect(`/kategori?tab=tambah_kategori_${type}`);
            return;
        }

        const kategoriBaru = String(inputKategoriBaru).trim().charAt(0).toUpperCase() + String(inputKategoriBaru).trim().slice(1);
        const dataQuery = await selectTable('kategori', {  eqCol: 'nama_kategori', eqRow: kategoriBaru});

        if (dataQuery && dataQuery.length > 0){
            res.redirect(`/kategori?tab=tambah_kategori_${type}&message=Kategori yang sama sudah ada, silahkan buat yang baru`);
            return;
        }

        const jenisDb = type === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan';
        await insertTable('kategori', { kategori: kategoriBaru, jenis: jenisDb });
        
        res.redirect(`/kategori?tab=${type}`);
        return;
    } catch (error){
        next(error);
        return;
    }
};
import type { Request, Response, NextFunction } from "express";
import { selectTable, insertTable, updateTable, deleteTable } from "../services/supabaseService";
import { format, parse } from "path";
import { match } from "assert";
import { constants } from "buffer";

const formatRupiah = (num: number):string => {
    return `Rp ${num.toLocaleString('id-ID', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

export const showAkunPage = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try{
        const tab = (req.query.tab as string) || '';
        const message = (req.query.message as string) || '';
        const editAkunId = req.query.edit_akun_id as string;
        const transferAkunId = req.query.transfer_akun_id as string;

        const akunTabunganQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        akunTabunganQuery.forEach(akun => totalSaldoNum += parseFloat(akun.total_akun || 0));
        const totalSaldo = formatRupiah(totalSaldoNum);

        const bulanIni = new Date().toISOString().slice(0, 7);

        const pengeluaranQuery = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni});
        const totalPengeluaran = formatRupiah(parseFloat(pengeluaranQuery[0]?.total_pengeluaran));

        const pemasukanQuery = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni});
        const totalPemasukan = formatRupiah(parseFloat(pemasukanQuery[0]?.total_pemasukan));

        const akunTabungan = await selectTable('akun_tabungan', { order1: 'id_akun'});

        let editAkun = null;
        if (editAkunId){
            const query = await selectTable('akun_tabungan', { eqCol: 'id_akun',  eqRow: editAkunId});
            if (query && query.length > 0) editAkun = query[0];
        }

        let transferAkun = null;
        if (transferAkunId){
            const query = await selectTable('akun_tabungan', { eqCol: 'id_akun', eqRow: transferAkunId});
            if (query && query.length > 0) transferAkun = query[0];
        }

        res.render('akun_tabungan', {
            totalSaldo, totalPengeluaran, totalPemasukan, akunTabungan, tab, message, editAkun, transferAkun
        });
        return;

    } catch (error){
        next(error);
        return;
    }
};

export const tambahAkun = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try{
        const { input_nama_akun, input_total } = req.body;
        const namaAkun = String(input_nama_akun || '').trim().charAt(0).toUpperCase() + String(input_nama_akun || '').trim().slice(1);
        const total = parseFloat(input_total || 0);

        const listAkunQuery = await selectTable('akun_tabungan', { eqCol: 'nama_akun', eqRow: namaAkun});
        if (listAkunQuery && listAkunQuery.length > 0) {
            res.redirect('/akun?tab=tambah_akun&message=Akun yang sama sudah ada, silahkan buat yang baru');
            return;
        }

        if (input_nama_akun && input_total) {
            await insertTable('akun_tabungan', { nama_akun: namaAkun, total_akun: total, total_awal: total });
        }
        res.redirect('/akun_tabungan');
        return;
    }catch(error){
        next(error);
        return;
    }
};

export const updateAkun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { input_nama_akun_baru, input_total_akun_baru } = req.body;

        const namaAkunQuery = await selectTable('akun_tabungan', { eqCol: 'nama_akun', eqRow: input_nama_akun_baru });
        const isDuplikat = namaAkunQuery.some(akun => akun.id_akun !== id);

        if (isDuplikat) {
            res.redirect(`/akun?edit_akun_id=${id}&tab=edit_akun&message=Sudah ada nama akun tabungan yang sama, gunakan nama lain`);
            return;
        }

        await updateTable('akun_tabungan', {
            nama_akun: input_nama_akun_baru,
            total_akun: parseFloat(input_total_akun_baru || 0)
        }, 'id_akun', id);

        res.redirect('/akun_tabungan');
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const prosesTransfer = async (req: Request, res: Response, next: NextFunction):Promise<void> => {
    try{
        const { id } = req.params;
        const { target_transfer, input_total_transfer } = req.body;
        const totalTransfer = parseFloat(input_total_transfer || 0);

        const akunSumber = await selectTable('akun_tabungan', { eqCol: 'id_akun', eqRow: id});
        const akunTarget = await selectTable('akun_tabungan', { eqCol: 'id_akun', eqRow: target_transfer});

        if (!akunSumber || akunSumber.length === 0 || !akunTarget || akunTarget.length === 0) {
            res.redirect('/akun?message=Gagal memproses transfer, akun tidak ditemukan');
            return;
        }

        await insertTable('data_historis', {
            tanggal: new Date().toISOString().slice(0, 10),
            id_akun_src: id,
            id_akun_target: target_transfer,
            jenis: 'Transfer',
            id_kategori: null,
            sub_kategori: 'Transfer',
            perubahan: totalTransfer
        });

        res.redirect('/akun_tabungan');
        return;
    }catch(error){
        next(error);
        return;
    }
};

export const hapusAkun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        await deleteTable('data_historis', 'id_akun_src', id);
        await deleteTable('akun_tabungan', 'id_akun', id);

        res.redirect('/akun_tabungan');
        return;
    } catch (error) {
        next(error);
        return;
    }
};
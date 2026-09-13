import type { Request, Response, NextFunction } from 'express';
import supabase from '../../config/supabase.js'; 
import { selectTable, updateTable, deleteTable } from '../services/supabaseService.js';

const formatRupiah = (num: number): string => {
    return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatTanggalIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const showHistoriPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const editHistoriId = req.query.edit_histori_id as string;
        const bulanIni = new Date().toISOString().slice(0, 7);

        const totalSaldoQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        totalSaldoQuery.forEach(akun => totalSaldoNum += parseFloat(akun.total_akun || 0));

        const pengeluaranQuery = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni });
        const pemasukanQuery = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni });

        const totalSaldo = totalSaldoQuery.length > 0 ? formatRupiah(totalSaldoNum) : 'Belum ada akun tabungan';
        const totalPengeluaran = formatRupiah(parseFloat(pengeluaranQuery[0]?.total_pengeluaran || 0));
        const totalPemasukan = formatRupiah(parseFloat(pemasukanQuery[0]?.total_pemasukan || 0));

        let editHistori = null;
        if (editHistoriId) {
            const query = await selectTable('data_historis', { eqCol: 'id_histori', eqRow: editHistoriId });
            if (query && query.length > 0) editHistori = query[0];
        }

        const { data: rawData, error: dbError } = await supabase
            .from('data_historis')
            .select(`
                id_histori,
                tanggal,
                jenis,
                sub_kategori,
                perubahan,
                id_akun_src,
                id_kategori,
                akun_tabungan!id_akun_src ( nama_akun ),
                kategori!id_kategori ( nama_kategori )
            `);

        if (dbError) throw new Error(`Gagal memuat relasi histori: ${dbError.message}`);
        const allData = rawData || [];

        const urutanTanggal = Array.from(new Set(allData.map(p => p.tanggal))).sort((a, b) => b.localeCompare(a));

        const dataHistorisRender = urutanTanggal.map(tgl => {
            const rawDataSehari = allData.filter(p => p.tanggal === tgl);
            
            let pemasukanSehariNum = 0;
            let pengeluaranSehariNum = 0;

            const dataSehariClean = rawDataSehari.map(p => {
                const nilai = parseFloat(p.perubahan || 0);
                if (p.jenis === 'Pemasukan') pemasukanSehariNum += nilai;
                if (p.jenis === 'Pengeluaran') pengeluaranSehariNum += Math.abs(nilai);

                const resAkun = p.akun_tabungan as any;
                const resKategori = p.kategori as any;

                return {
                    id: p.id_histori,
                    id_kategori: p.id_kategori,
                    tanggal: p.tanggal,
                    jenis: p.jenis,
                    sub_kategori: p.sub_kategori,
                    perubahan: p.perubahan,
                    nama_akun: resAkun?.nama_akun || 'Akun Terhapus',
                    nama_kategori: resKategori?.nama_kategori || 'Tanpa Kategori'
                };
            });

            const cashFlowNum = pemasukanSehariNum - pengeluaranSehariNum;

            return {
                tanggalTeks: formatTanggalIndo(tgl),
                pengeluaran: pengeluaranSehariNum.toLocaleString('id-ID', { minimumFractionDigits: 2 }),
                pemasukan: pemasukanSehariNum.toLocaleString('id-ID', { minimumFractionDigits: 2 }),
                cashFlow: cashFlowNum.toLocaleString('id-ID', { minimumFractionDigits: 2 }),
                dataSehari: dataSehariClean
            };
        });

        const listAkun = await selectTable('akun_tabungan', { order1: 'nama_akun' });
        const listKategori = await selectTable('kategori', { order1: 'id_kategori' });

        res.render('histori', {
            totalSaldo,
            totalPengeluaran,
            totalPemasukan,
            dataHistoris: dataHistorisRender,
            editHistori,
            akunTabungan: listAkun,
            kategori: listKategori
        });
    } catch (error) {
        next(error);
    }
};

export const updateHistori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { input_nama_akun_baru, input_kategori_baru, input_sub_kategori_baru, input_perubahan_baru, input_tanggal_baru } = req.body;
        const perubahanBaru = parseFloat(input_perubahan_baru || 0);

        const akunQuery = await selectTable('akun_tabungan', { select: 'id_akun', eqCol: 'nama_akun', eqRow: input_nama_akun_baru });
        const katQuery = await selectTable('kategori', { select: 'id_kategori', eqCol: 'nama_kategori', eqRow: input_kategori_baru });

        if (!akunQuery || akunQuery.length === 0 || !katQuery || katQuery.length === 0) {
            res.redirect('/histori_data?message=Gagal memperbarui, relasi ID tidak valid');
            return;
        }

        await updateTable('data_historis', {
            id_akun_src: akunQuery[0]?.id_akun,
            id_kategori: katQuery[0]?.id_kategori,
            sub_kategori: String(input_sub_kategori_baru || '').trim(),
            perubahan: perubahanBaru,
            tanggal: input_tanggal_baru
        }, 'id_histori', id);

        res.redirect('/histori_data');
    } catch (error) {
        next(error);
    }
};

export const hapusHistori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        await deleteTable('data_historis', 'id_histori', id);
        res.redirect('/histori_data');
    } catch (error) {
        next(error);
    }
};
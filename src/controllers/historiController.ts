import type { Request, Response, NextFunction } from 'express';
import { selectTable, updateTable, deleteTable } from '../services/supabaseService.js';

const formatRupiah = (num: number): string => {
    return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatTanggalIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getBulanSekarang = (): string => new Date().toISOString().slice(0, 7);

export const showHistoriPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const message = (req.query.message as string) || '';
        const editHistoriId = req.query.edit_histori_id as string;

        // Filter: 'all' = all time, 'bulan' = per bulan
        const filter = (req.query.filter as string) === 'all' ? 'all' : 'bulan';
        const isAllTime = filter === 'all';
        const bulanAktif = (req.query.bulan as string) || getBulanSekarang();

        // Total saldo (selalu dari semua akun)
        const totalSaldoQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        totalSaldoQuery.forEach(akun => totalSaldoNum += parseFloat(akun.total_akun || 0));
        const totalSaldo = totalSaldoQuery.length > 0
            ? formatRupiah(totalSaldoNum)
            : 'Belum ada akun tabungan';

        // Ambil semua data histori + relasi
        const rawData = await selectTable('data_historis', {
            select: `
                id_histori,
                tanggal,
                jenis,
                sub_kategori,
                perubahan,
                id_akun_src,
                id_kategori,
                akun_tabungan!id_akun_src ( nama_akun ),
                kategori!id_kategori ( nama_kategori )
            `,
            order1: 'id_histori',
            order1State: true
        });

        const allData = rawData || [];

        // Daftar bulan yang tersedia dari data histori
        let listBulan = Array.from(
            new Set(
                allData
                    .map(p => (p.tanggal ? String(p.tanggal).slice(0, 7) : ''))
                    .filter(b => b.length === 7)
            )
        ).sort((a, b) => b.localeCompare(a));

        if (listBulan.length === 0) listBulan = [bulanAktif];
        if (!listBulan.includes(bulanAktif)) listBulan.unshift(bulanAktif);

        // Filter data sesuai pilihan
        const dataTerfilter = isAllTime
            ? allData
            : allData.filter(p => p.tanggal && String(p.tanggal).slice(0, 7) === bulanAktif);

        // Hitung total pemasukan & pengeluaran dari data yang sedang difilter
        let totalPemasukanNum = 0;
        let totalPengeluaranNum = 0;
        dataTerfilter.forEach(p => {
            const nilai = parseFloat(p.perubahan || 0);
            if (p.jenis === 'Pemasukan') totalPemasukanNum += nilai;
            if (p.jenis === 'Pengeluaran') totalPengeluaranNum += Math.abs(nilai);
        });

        const totalPemasukan = formatRupiah(totalPemasukanNum);
        const totalPengeluaran = formatRupiah(totalPengeluaranNum);

        // Data untuk form edit
        let editHistori = null;
        if (editHistoriId) {
            const query = await selectTable('data_historis', { eqCol: 'id_histori', eqRow: editHistoriId });
            if (query && query.length > 0) editHistori = query[0];
        }

        // Kelompokkan per tanggal (descending)
        const urutanTanggal = Array.from(
            new Set(dataTerfilter.map(p => p.tanggal))
        ).sort((a, b) => String(b).localeCompare(String(a)));

        const dataHistorisRender = urutanTanggal.map(tgl => {
            const rawDataSehari = dataTerfilter.filter(p => p.tanggal === tgl);

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
                    nama_kategori: resKategori?.nama_kategori || ''
                };
            });

            const cashFlowNum = pemasukanSehariNum - pengeluaranSehariNum;

            return {
                tanggalTeks: formatTanggalIndo(String(tgl)),
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
            kategori: listKategori,
            message,
            filterAktif: filter,
            bulanAktif,
            listBulan
        });
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const updateHistori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            input_nama_akun_baru,
            input_kategori_baru,
            input_sub_kategori_baru,
            input_perubahan_baru,
            input_tanggal_baru
        } = req.body;
        const perubahanBaru = parseFloat(input_perubahan_baru || 0);

        const akunQuery = await selectTable('akun_tabungan', {
            select: 'id_akun',
            eqCol: 'nama_akun',
            eqRow: input_nama_akun_baru
        });
        const katQuery = await selectTable('kategori', {
            select: 'id_kategori',
            eqCol: 'nama_kategori',
            eqRow: input_kategori_baru
        });

        if (!akunQuery || akunQuery.length === 0 || !katQuery || katQuery.length === 0) {
            res.redirect('/histori?message=Gagal memperbarui, relasi ID tidak valid');
            return;
        }

        await updateTable('data_historis', {
            id_akun_src: akunQuery[0]?.id_akun,
            id_kategori: katQuery[0]?.id_kategori,
            sub_kategori: String(input_sub_kategori_baru || '').trim(),
            perubahan: perubahanBaru,
            tanggal: input_tanggal_baru
        }, 'id_histori', id);

        // Pertahankan filter setelah update
        const filter = (req.query.filter as string) === 'all' ? 'all' : 'bulan';
        const bulan = (req.query.bulan as string) || getBulanSekarang();
        res.redirect(`/histori?filter=${filter}&bulan=${bulan}`);
        return;
    } catch (error) {
        next(error);
        return;
    }
};

export const hapusHistori = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        await deleteTable('data_historis', 'id_histori', id);

        // Pertahankan filter setelah hapus
        const filter = (req.query.filter as string) === 'all' ? 'all' : 'bulan';
        const bulan = (req.query.bulan as string) || getBulanSekarang();
        res.redirect(`/histori?filter=${filter}&bulan=${bulan}`);
        return;
    } catch (error) {
        next(error);
        return;
    }
};
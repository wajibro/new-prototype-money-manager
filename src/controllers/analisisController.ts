import type { Request, Response, NextFunction } from 'express';
import { selectTable } from '../services/supabaseService.js';

const formatRupiah = (num: number): string => {
    return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const showAnalisisPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // ── 1. Tangkap Filter & Bulan dari URL (Sama seperti histori) ──
        const filter = (req.query.filter as string) === 'all' ? 'all' : 'bulan';
        const isAllTime = filter === 'all';
        const bulanAktif = (req.query.bulan as string) || new Date().toISOString().slice(0, 7);

        // ── 2. Ambil semua data mentah ──
        const analisisRaw = await selectTable('view_analisis_pengeluaran_json', {
            order1: 'bulan',
            order1State: true
        });

        const saldoHarianRaw = await selectTable('riwayat_saldo_harian', {
            order1: 'tanggal',
            order1State: true
        });

        const saldoPerAkunRaw = await selectTable('riwayat_tiap_saldo_harian', {
            order1: 'tanggal',
            order1State: true
        });

        // ── 3. Buat Daftar Bulan yang Tersedia untuk Dropdown ──
        let listBulan = Array.from(
            new Set(
                analisisRaw.map(a => a.bulan)
                    .concat(saldoHarianRaw.map(s => s.tanggal ? String(s.tanggal).slice(0, 7) : ''))
                    .filter(b => b && b.length === 7)
            )
        ).sort((a, b) => b.localeCompare(a));

        if (listBulan.length === 0) listBulan = [bulanAktif];
        if (!listBulan.includes(bulanAktif)) listBulan.unshift(bulanAktif);

        // ── 4. Filter Data Berdasarkan Pilihan ──
        const filteredAnalisis = isAllTime 
            ? analisisRaw 
            : analisisRaw.filter(a => a.bulan === bulanAktif);

        const filteredSaldoHarian = isAllTime 
            ? saldoHarianRaw 
            : saldoHarianRaw.filter(s => s.tanggal && String(s.tanggal).startsWith(bulanAktif));

        const filteredSaldoPerAkun = isAllTime 
            ? saldoPerAkunRaw 
            : saldoPerAkunRaw.filter(s => s.tanggal && String(s.tanggal).startsWith(bulanAktif));

        // ── Header summary (Tetap menggunakan data bulan ini sebagai informasi utama) ──
        const akunQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        akunQuery.forEach(a => totalSaldoNum += parseFloat(a.total_akun || 0));
        const totalSaldo = formatRupiah(totalSaldoNum);

        const bulanIni = new Date().toISOString().slice(0, 7);
        const recap = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni });
        const totalPengeluaran = formatRupiah(parseFloat(recap[0]?.total_pengeluaran || 0));
        const totalPemasukan = formatRupiah(parseFloat(recap[0]?.total_pemasukan || 0));

        // ── Serialize aman untuk disuntik ke <script> ──
        const safe = (obj: any) => JSON.stringify(obj).replace(/</g, '\\u003c');

        res.render('analisis', {
            totalSaldo,
            totalPemasukan,
            totalPengeluaran,
            // Data yang dikirim adalah data yang sudah difilter
            analisisDataJson: safe(filteredAnalisis || []),
            saldoHarianJson: safe(filteredSaldoHarian || []),
            saldoPerAkunJson: safe(filteredSaldoPerAkun || []),
            // State untuk UI Filter
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
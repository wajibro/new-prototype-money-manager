import type { Request, Response, NextFunction } from 'express';
import { selectTable } from '../services/supabaseService.js';

const formatRupiah = (num: number): string => {
    return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const showAnalisisPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // ── Data donut: analisis pengeluaran per bulan (JSON view)
        const analisisRaw = await selectTable('view_analisis_pengeluaran_json', {
            order1: 'bulan',
            order1State: true
        });

        // ── Data saldo harian sistem
        const saldoHarianRaw = await selectTable('riwayat_saldo_harian', {
            order1: 'tanggal',
            order1State: true
        });

        // ── Data saldo harian per akun
        const saldoPerAkunRaw = await selectTable('riwayat_tiap_saldo_harian', {
            order1: 'tanggal',
            order1State: true
        });

        // ── Header summary
        const akunQuery = await selectTable('akun_tabungan', { select: 'total_akun' });
        let totalSaldoNum = 0;
        akunQuery.forEach(a => totalSaldoNum += parseFloat(a.total_akun || 0));
        const totalSaldo = formatRupiah(totalSaldoNum);

        const bulanIni = new Date().toISOString().slice(0, 7);
        const recap = await selectTable('view_recap_bulanan', { eqCol: 'bulan', eqRow: bulanIni });
        const totalPengeluaran = formatRupiah(parseFloat(recap[0]?.total_pengeluaran || 0));
        const totalPemasukan = formatRupiah(parseFloat(recap[0]?.total_pemasukan || 0));

        // ── Serialize aman untuk disuntik ke <script>
        const safe = (obj: any) => JSON.stringify(obj).replace(/</g, '\\u003c');

        res.render('analisis', {
            totalSaldo,
            totalPemasukan,
            totalPengeluaran,
            analisisDataJson: safe(analisisRaw || []),
            saldoHarianJson: safe(saldoHarianRaw || []),
            saldoPerAkunJson: safe(saldoPerAkunRaw || [])
        });
        return;
    } catch (error) {
        next(error);
        return;
    }
};
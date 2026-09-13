import { Request, Response, NextFunction } from 'express';
import Config from '../../config/index.js';

export const showAuthPage = (req: Request, res: Response):void => {
    if(req.session.logged_in){
        res.redirect('/kategori');
    }

    const tab = (req.query.tab as string) || 'bisa';
    res.render('auth', {tab});
}

export const login = (req: Request, res: Response): void => {
    try {
        const { input_pin } = req.body;

        const pin = parseInt(input_pin, 10);
        const rawCorrectPin = Config.CORRECT_PIN || "1234"; 
        const correctPin = parseInt(rawCorrectPin, 10);

        if (pin === correctPin) {
            req.session.logged_in = true;
            req.session.pin_verified = true;

            req.session.save((err) => {
                if (err) {
                    console.error('Gagal menyimpan sesi ke database:', err);
                    res.status(500).send('Gagal Login, silahkan coba lagi');
                    return;
                }
                return res.redirect('/kategori');
            });
        } else {
            return res.render('auth', { tab: 'gagal' });
        }
    } catch (error) {
        console.error('Galat fatal pada internal login:', error);
        res.status(500).send('Terjadi kesalahan internal server');
    }
};

export const logout = (req: Request, res: Response):void => {
    req.session.destroy((err) =>{
        if (err) return res.status(500).send('Gagal Logout');
        res.redirect('/auth');
    });
};
import { Request, Response, NextFunction } from 'express';
import Config from '../../config/index.js';

export const showAuthPage = (req: Request, res: Response):void => {
    if(req.session.logged_in){
        res.redirect('/kategori');
    }

    const tab = (req.query.tab as string) || 'bisa';
    res.render('auth', {tab});
}

export const login = (req: Request, res: Response):void => {
    const { input_pin } = req.body;

    const pin = parseInt(input_pin, 10);
    const correctPin = parseInt(Config.CORRECT_PIN, 10);

    if (pin === correctPin){
        req.session.regenerate((err) => {
            if (err) return res.status(500).send('Gagal Login, silahkan coba lagi');

            req.session.logged_in = true;
            req.session.pin_verified = true;

            res.redirect('/kategori');
        });
    }else{
        res.render('auth', { tab: 'gagal' });
    }
};

export const logout = (req: Request, res: Response):void => {
    req.session.destroy((err) =>{
        if (err) return res.status(500).send('Gagal Logout');
        res.redirect('/auth');
    });
};
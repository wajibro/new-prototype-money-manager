import type { Request, Response, NextFunction } from "express";

export const loginRequired = (req: Request, res: Response, next: NextFunction):void =>{
    if(!req.session.logged_in){
        res.redirect('/auth');
        return;
    }
    next();
};
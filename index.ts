import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from '@vercel/speed-insights';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import Config from './config/index.js';

import authRoutes from './src/routes/authRoutes.js';
import kategoriRoutes from './src/routes/kategoriRoutes.js';
import akunRoutes from './src/routes/akunRoutes.js';
import historiRoutes from './src/routes/historiRoutes.js';

const app = express();
const PostgresSessionStore = pgSession(session);

inject({ mode: Config.IS_PRODUCTION ? 'production' : 'development', debug: !Config.IS_PRODUCTION });
injectSpeedInsights(); 

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pgPool = new pg.Pool({
    connectionString: Config.SESSION_URL,
    max: 2, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
        rejectUnauthorized: false
    }
});

pgPool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
});

app.use(session({
    store: new PostgresSessionStore({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: false
    }),
    secret: Config.SESSION_SECRET || ')#j398Bk64MGsa=|',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use('/auth', authRoutes);
app.use('/kategori', kategoriRoutes);
app.use('/akun_tabungan', akunRoutes);
app.use('/histori', historiRoutes);

if (!Config.IS_PRODUCTION) {
    app.listen(Config.PORT, () => {
        console.log(`http://localhost:${Config.PORT}`);
    });
}

app.get('/', (req: Request, res: Response) => {
    res.redirect('/auth');
})

export default app;
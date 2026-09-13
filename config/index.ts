import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production'){
    dotenv.config();
}

interface AppConfig{
    PORT: number | string;
    SESSION_SECRET: string;
    URL: string;
    KEY: string;
    CORRECT_PIN: string;
    IS_PRODUCTION: boolean;
}

const Config: AppConfig = {
    PORT: process.env.PORT || 5000,
    SESSION_SECRET: process.env.SESSION_SECRET || '',
    URL: (process.env.DB_URL as string),
    KEY: (process.env.DB_KEY as string),
    CORRECT_PIN: process.env.CORRECT_PIN || '123',
    IS_PRODUCTION: process.env.NODE_ENV == 'production'
};

if (!Config.URL || !Config.KEY){
    console.warn('URL atau KEY database tidak ditemukan')
}

export default Config;
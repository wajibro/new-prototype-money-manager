import 'express-session';

declare module 'express-session'{
    interface SessionData{
        logged_in?: boolean,
        pin_verified?: boolean
    }
}
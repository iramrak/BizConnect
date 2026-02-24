/**
 * Extend NextAuth types to include our custom fields:
 * - accessToken on Session
 * - role + id on Session.user
 * - custom fields on JWT
 */

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface User {
        role?: string;
        accessToken?: string;
        refreshToken?: string;
    }

    interface Session {
        accessToken?: string;
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        role?: string;
        userId?: string;
    }
}

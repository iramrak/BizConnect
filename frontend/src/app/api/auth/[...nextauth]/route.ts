import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "BizConnect",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "user@example.com" },
                password: { label: "Пароль", type: "password" },
            },

            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {

                    const tokenRes = await fetch("http://localhost:8000/api/token/", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!tokenRes.ok) return null;

                    const tokens = await tokenRes.json();

                    const userRes = await fetch("http://localhost:8000/api/users/", {
                        headers: {
                            Authorization: `Bearer ${tokens.access}`,
                            "Content-Type": "application/json",
                        },
                    });

                    if (!userRes.ok) return null;

                    const usersData = await userRes.json();

                    const users = usersData.results || usersData;
                    const me = Array.isArray(users)
                        ? users.find((u: { email: string }) => u.email === credentials.email)
                        : null;

                    if (!me) return null;

                    return {
                        id: String(me.id),
                        email: me.email,
                        name: `${me.first_name} ${me.last_name}`.trim() || me.email,
                        role: me.role,
                        accessToken: tokens.access,
                        refreshToken: tokens.refresh,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 60 * 60,
    },

    pages: {
        signIn: "/login",
    },

    callbacks: {
        async jwt({ token, user }) {

            if (user) {
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.role = user.role;
                token.userId = user.id;
            }
            return token;
        },

        async session({ session, token }) {

            session.accessToken = token.accessToken as string;
            session.user = {
                ...session.user,
                id: token.userId as string,
                role: token.role as string,
            };
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

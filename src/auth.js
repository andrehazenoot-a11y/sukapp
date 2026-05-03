import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    basePath: '/api/nextauth',
    providers: [
        MicrosoftEntraID({
            clientId: process.env.OUTLOOK_CLIENT_ID,
            clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
            tenantId: process.env.AZURE_TENANT_ID,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
            authorization: {
                url: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
                params: { scope: 'openid profile email' },
            },
            token: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
            userinfo: 'https://graph.microsoft.com/oidc/userinfo',
        }),
        // Noodtoegang voor als Microsoft niet beschikbaar is
        Credentials({
            id: 'noodbeheer',
            name: 'Noodtoegang',
            credentials: {
                username: { label: 'Gebruikersnaam', type: 'text' },
                password: { label: 'Wachtwoord', type: 'password' },
            },
            async authorize(credentials) {
                const fallbackUser = process.env.DASHBOARD_FALLBACK_USER;
                const fallbackHash = process.env.DASHBOARD_FALLBACK_HASH;
                if (!fallbackUser || !fallbackHash || !credentials?.username || !credentials?.password) {
                    return null;
                }
                if (credentials.username !== fallbackUser) return null;
                const ok = await bcrypt.compare(String(credentials.password), fallbackHash);
                if (!ok) return null;
                return {
                    id: 'noodbeheer',
                    name: 'Noodbeheer',
                    email: 'noodbeheer@intern',
                    role: 'Beheerder',
                };
            },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Na uitloggen: ga naar /login
            if (url === `${baseUrl}/login`) return `${baseUrl}/login`;
            // Na inloggen (Microsoft of noodbeheer): altijd dashboard
            // (voorkomt dat stale /medewerker cookie de redirect kaapt)
            return baseUrl;
        },
        async jwt({ token, account, user }) {
            // Bij eerste inlog: rol vastleggen in JWT
            if (account?.provider === 'microsoft-entra-id') {
                token.role = 'Beheerder';
                token.provider = 'microsoft';
            }
            if (account?.provider === 'noodbeheer') {
                token.role = 'Beheerder';
                token.provider = 'noodbeheer';
            }
            if (user?.role) token.role = user.role;
            return token;
        },
        async session({ session, token }) {
            session.user.role = token.role ?? 'Beheerder';
            session.user.provider = token.provider;
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: { strategy: 'jwt' },
    trustHost: true,
    debug: true,
});

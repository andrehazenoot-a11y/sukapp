import './globals.css';
import './style.css';
import './forms.css';
import './tables.css';
import './projects.css';

import { Inter } from 'next/font/google';
import AppShell from '@/components/AppShell';
import NextAuthProvider from '@/components/NextAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SchildersApp Katwijk | Dashboard',
  description: 'Intern portaal voor personeel, materieel en projecten van De Schilders uit Katwijk.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <NextAuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </NextAuthProvider>
      </body>
    </html>
  );
}

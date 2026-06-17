import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });
import { ThemeProvider } from '@/components/theme-provider';
import { ToastContainer } from 'react-toastify';
import NextTopLoader from 'nextjs-toploader';
import 'react-toastify/dist/ReactToastify.css';

export const metadata: Metadata = {
  title: "Nohemy's Boutique — POS",
  description: 'Sistema de punto de venta para Nohemy\'s Boutique',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} font-sans`}>
        <div className="overflow-hidden">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            disableTransitionOnChange
          >
            <NextTopLoader showSpinner={false} />
            {children}
            <ToastContainer />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}

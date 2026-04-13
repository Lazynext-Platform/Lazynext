import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Lazynext — The Anti-Software Workflow Platform',
  description: 'One platform that replaces every tool your team is already misusing. Tasks, docs, decisions, and AI — unified in one graph.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Lazynext — Stop Switching Apps. Start Shipping Work.',
    description: 'Tasks, docs, decisions, and AI in one unified workspace. Decision DNA tracks every choice your team makes.',
    type: 'website',
    siteName: 'Lazynext',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lazynext — Stop Switching Apps. Start Shipping Work.',
    description: 'Tasks, docs, decisions, and AI in one unified workspace.',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.variable} min-h-screen bg-[#020617] font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1E293B',
              border: '1px solid #334155',
              color: '#F8FAFC',
            },
          }}
        />
      </body>
    </html>
  )
}

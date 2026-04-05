import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lazynext — The Anti-Software Workflow Platform',
  description: 'One platform that replaces every tool your team is already misusing. Tasks, docs, decisions, and AI — unified in one graph.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Lazynext — Stop Switching Apps. Start Shipping Work.',
    description: 'Tasks, docs, decisions, and AI in one unified workspace. Decision DNA tracks every choice your team makes.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#4F6EF7',
          colorBackground: '#0F172A',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-[#020617] font-sans antialiased">
          {children}
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
    </ClerkProvider>
  )
}

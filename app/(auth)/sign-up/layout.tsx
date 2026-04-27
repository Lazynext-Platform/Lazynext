import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Create your account — Lazynext',
  },
  description:
    'Create your Lazynext workspace in minutes. Free plan available.',
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children
}

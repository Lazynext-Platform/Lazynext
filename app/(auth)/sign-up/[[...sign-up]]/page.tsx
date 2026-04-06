import { SignUp } from '@clerk/nextjs'

const hasValidClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_') &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder')

export default function SignUpPage() {
  if (!hasValidClerkKeys) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign Up</h2>
        <p className="text-slate-500 mb-4">Authentication is not configured yet.</p>
        <p className="text-sm text-slate-400">Set <code className="bg-slate-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your <code className="bg-slate-100 px-1.5 py-0.5 rounded">.env.local</code> to enable sign up.</p>
        <a href="/" className="mt-6 inline-block text-[#4F6EF7] hover:underline">← Back to home</a>
      </div>
    )
  }

  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'w-full shadow-none border-0 p-0',
          headerTitle: 'text-2xl font-bold text-slate-900',
          headerSubtitle: 'text-slate-500',
          socialButtonsBlockButton:
            'border border-slate-200 hover:bg-slate-50 transition-colors',
          formFieldInput:
            'rounded-lg border-slate-200 focus:ring-2 focus:ring-[#4F6EF7] focus:border-transparent',
          formButtonPrimary:
            'bg-[#4F6EF7] hover:bg-[#3D5BD4] rounded-lg py-3 text-sm font-semibold',
          footerActionLink: 'text-[#4F6EF7] hover:text-[#3D5BD4]',
        },
      }}
    />
  )
}

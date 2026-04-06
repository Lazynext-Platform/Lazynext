import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
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

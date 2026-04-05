export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}

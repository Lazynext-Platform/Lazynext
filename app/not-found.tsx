import Image from 'next/image'
import Link from 'next/link'
import { NotFoundState } from '@/components/ui/EmptyStates'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020617]">
      <Link href="/" className="mb-8">
        <Image src="/logo-dark.png" alt="Lazynext" width={140} height={35} className="h-9 w-auto" />
      </Link>
      <NotFoundState />
    </div>
  )
}

import './sdr.css'
import { PageGuard } from '@/components/auth/PageGuard'

export default function SdrLayout({ children }: { children: React.ReactNode }) {
  return <PageGuard page="sdr">{children}</PageGuard>
}

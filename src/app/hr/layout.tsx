import './hr.css'
import { PageGuard } from '@/components/auth/PageGuard'

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <PageGuard page="hr">{children}</PageGuard>
}

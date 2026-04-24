export type Role = 'admin' | 'user'

export type PagePermission = 'accounts' | 'hr' | 'sdr' | 'crm' | 'slides'

export interface AppUser {
  user_id: string
  email: string
  name: string
  role: Role
  page_permissions: PagePermission[]
  created_at: string
  updated_at: string
}

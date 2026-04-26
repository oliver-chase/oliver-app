export type Role = 'admin' | 'user'

export type PagePermission = 'accounts' | 'hr' | 'sdr' | 'crm' | 'slides' | 'reviews' | 'campaigns'

export interface AppUser {
  user_id: string
  email: string
  name: string
  person_id?: string | null
  role: Role
  page_permissions: PagePermission[]
  created_at: string
  updated_at: string
  is_owner?: boolean
  effective_role?: Role
  effective_page_permissions?: PagePermission[]
}

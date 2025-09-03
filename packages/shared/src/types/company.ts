export interface Company {
  id: string;
  name: string;
  code: string;
  business_number?: string;
  ceo_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyLocation {
  id: string;
  company_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
}

export interface OrgUnit {
  id: string;
  company_id: string;
  parent_id?: string;
  name: string;
  code: string;
  level: number;
  path: string;
  manager_id?: string;
  is_active: boolean;
}
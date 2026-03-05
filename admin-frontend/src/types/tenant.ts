/** Контрагент (арендатор/арендодатель и т.д.) — core.Tenant */

export interface Tenant {
  id: number;
  name: string;
  type: string;
  type_display?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  inn?: string;
  address?: string;
  comment?: string;
}

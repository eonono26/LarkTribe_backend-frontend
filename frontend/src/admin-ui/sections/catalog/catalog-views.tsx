'use client';

import Typography from '@mui/material/Typography';

import { adminApi } from '@/lib/admin-api';
import { Label } from '@/admin-ui/components/label';

import { CatalogManager } from './catalog-manager';

import type { Department, Category, Brand, AgeGroup } from '@/lib/admin-types';

// ----------------------------------------------------------------------

export function DepartmentsView() {
  return (
    <CatalogManager<Department>
      config={{
        title: 'Departments', noun: 'department', subtitle: 'The top-level sections of the store (Women, Men, Kids, Baby…).',
        api: adminApi.departments,
        defaults: { name: '', order: 0, description: '', is_active: true },
        toForm: (r) => ({ name: r.name, order: r.order, description: r.description, is_active: r.is_active }),
        fields: [
          { name: 'name', label: 'Name', required: true },
          { name: 'order', label: 'Display order', type: 'number', half: true, helper: 'Lower numbers appear first.' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'is_active', label: 'Visible in the store', type: 'switch' },
        ],
        extraColumns: [{ id: 'cats', label: 'Categories', render: (r) => r.category_count }, { id: 'order', label: 'Order', render: (r) => r.order }],
      }}
    />
  );
}

export function CategoriesView() {
  return (
    <CatalogManager<Category>
      config={{
        title: 'Categories', noun: 'category', subtitle: 'Product categories inside each department. Nest them with a parent.',
        api: adminApi.categories,
        lookups: adminApi.lookups,
        defaults: { department: '', parent: '', name: '', order: 0, description: '', is_active: true },
        toForm: (r) => ({ department: r.department, parent: r.parent ?? '', name: r.name, order: r.order, description: r.description, is_active: r.is_active }),
        filter: { param: 'department', label: 'Department', options: (l) => (l?.departments ?? []).map((d) => ({ value: d.id, label: d.name })) },
        fields: [
          { name: 'name', label: 'Name', required: true },
          { name: 'department', label: 'Department', type: 'select', required: true, half: true, options: (_, l) => (l?.departments ?? []).map((d) => ({ value: d.id, label: d.name })) },
          {
            name: 'parent', label: 'Parent category', type: 'select', half: true, helper: 'Optional — leave empty for a top-level category.',
            options: (f, l) => (l?.categories ?? []).filter((c) => c.parent === null && c.department === f.department).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: 'order', label: 'Display order', type: 'number', half: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'is_active', label: 'Visible in the store', type: 'switch' },
        ],
        extraColumns: [{
          id: 'dept', label: 'Department',
          render: (r) => (<><Typography variant="body2">{r.department_name}</Typography>{r.parent_name && <Typography variant="caption" color="text.secondary">in {r.parent_name}</Typography>}</>),
        }],
      }}
    />
  );
}

export function BrandsView() {
  return (
    <CatalogManager<Brand>
      config={{
        title: 'Brands', noun: 'brand', subtitle: 'Labels shown on products and the brand filters.',
        api: adminApi.brands,
        defaults: { name: '', description: '', website: '', is_active: true },
        toForm: (r) => ({ name: r.name, description: r.description, website: r.website, is_active: r.is_active }),
        fileField: { name: 'logo', label: 'Upload logo (optional)' },
        fields: [
          { name: 'name', label: 'Name', required: true },
          { name: 'website', label: 'Website', helper: 'https://…' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'is_active', label: 'Visible in the store', type: 'switch' },
        ],
      }}
    />
  );
}

export function AgeGroupsView() {
  return (
    <CatalogManager<AgeGroup>
      config={{
        title: 'Age groups', noun: 'age group', subtitle: 'Age ranges shoppers can filter by (e.g. 0–3 months, 4–6 years).',
        api: adminApi.ageGroups,
        defaults: { name: '', stage: 'kids', min_age_years: '', max_age_years: '', icon: '', order: 0, is_active: true },
        toForm: (r) => ({ name: r.name, stage: r.stage, min_age_years: r.min_age_years, max_age_years: r.max_age_years, icon: r.icon, order: r.order, is_active: r.is_active }),
        filter: { param: 'stage', label: 'Stage', options: () => [{ value: 'baby', label: 'Baby' }, { value: 'kids', label: 'Kids' }, { value: 'teens', label: 'Teens' }] },
        fields: [
          { name: 'name', label: 'Name', required: true, half: true },
          { name: 'stage', label: 'Stage', type: 'select', required: true, half: true, options: () => [{ value: 'baby', label: 'Baby' }, { value: 'kids', label: 'Kids' }, { value: 'teens', label: 'Teens' }] },
          { name: 'min_age_years', label: 'From (years)', type: 'number', half: true, helper: 'e.g. 0.25 = 3 months' },
          { name: 'max_age_years', label: 'To (years)', type: 'number', half: true },
          { name: 'icon', label: 'Icon / emoji', half: true },
          { name: 'order', label: 'Display order', type: 'number', half: true },
          { name: 'is_active', label: 'Visible in the store', type: 'switch' },
        ],
        extraColumns: [{
          id: 'stage', label: 'Stage',
          render: (r) => (<><Label>{r.stage}</Label><Typography variant="caption" sx={{ ml: 1 }} color="text.secondary">{r.min_age_years}–{r.max_age_years} yrs</Typography></>),
        }],
      }}
    />
  );
}

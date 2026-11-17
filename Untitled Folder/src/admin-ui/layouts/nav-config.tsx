import type { IconifyName } from '@/admin-ui/components/iconify';

export type NavItem = { title: string; path: string; icon: IconifyName; badgeKey?: 'pending_products' | 'pending_vendors' | 'open_tickets' };
export type NavGroup = { subheader?: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  { items: [{ title: 'Overview', path: '/admin', icon: 'solar:pie-chart-2-bold-duotone' }] },
  {
    subheader: 'Catalog',
    items: [
      { title: 'Products', path: '/admin/products', icon: 'solar:box-bold-duotone', badgeKey: 'pending_products' },
      { title: 'Departments', path: '/admin/departments', icon: 'solar:widget-5-bold-duotone' },
      { title: 'Categories', path: '/admin/categories', icon: 'solar:t-shirt-bold-duotone' },
      { title: 'Brands', path: '/admin/brands', icon: 'solar:star-bold-duotone' },
      { title: 'Age groups', path: '/admin/age-groups', icon: 'solar:users-group-two-rounded-bold-duotone' },
    ],
  },
  {
    subheader: 'Sales',
    items: [
      { title: 'Orders', path: '/admin/orders', icon: 'solar:cart-large-2-bold-duotone' },
      { title: 'Customers & staff', path: '/admin/users', icon: 'solar:users-group-rounded-bold-duotone' },
      { title: 'Dispatch', path: '/admin/dispatch', icon: 'solar:delivery-bold-duotone' },
    ],
  },
  {
    subheader: 'Marketplace',
    items: [
      { title: 'Vendors', path: '/admin/vendors', icon: 'solar:shop-2-bold-duotone', badgeKey: 'pending_vendors' },
      { title: 'Promotions', path: '/admin/promotions', icon: 'solar:tag-price-bold-duotone' },
      { title: 'Support', path: '/admin/support', icon: 'solar:chat-round-dots-bold-duotone', badgeKey: 'open_tickets' },
      { title: 'AI insights', path: '/admin/insights', icon: 'solar:magic-stick-3-bold-duotone' },
    ],
  },
];

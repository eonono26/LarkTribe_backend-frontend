import { Label } from '@/admin-ui/components/label';
import { titleCase } from '@/admin-ui/utils/format';

import type { LabelColor } from '@/admin-ui/components/label';

const COLORS: Record<string, LabelColor> = {
  active: 'success', approved: 'success', delivered: 'success', paid: 'success', resolved: 'success', completed: 'success',
  pending: 'warning', pending_payment: 'warning', open: 'warning', draft: 'default', in_progress: 'info', processing: 'info', confirmed: 'info',
  shipped: 'info', out_for_delivery: 'info', assigned: 'info', picked_up: 'info', accepted: 'info',
  rejected: 'error', cancelled: 'error', suspended: 'error', refunded: 'error', failed: 'error', closed: 'default',
};

export function StatusLabel({ value, label }: { value: string; label?: string }) {
  return <Label color={COLORS[value] ?? 'default'}>{label ?? titleCase(value)}</Label>;
}

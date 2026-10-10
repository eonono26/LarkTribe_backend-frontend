import { ProductFormView } from '@/admin-ui/sections/products/product-form-view';

export const metadata = { title: 'Edit product — Larktribe Admin' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductFormView productId={Number(id)} />;
}

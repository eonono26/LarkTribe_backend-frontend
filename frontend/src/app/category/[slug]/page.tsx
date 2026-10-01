import { redirect } from "next/navigation";

/**
 * /category/[slug] is a legacy department route (still linked from
 * DepartmentCard and PDP breadcrumbs). Rather than maintain a second,
 * out-of-date PLP implementation, it now forwards to the fully
 * redesigned /shop catalog, scoped to the same department — one PLP
 * implementation that matches the approved design, instead of two that
 * can drift apart.
 */
export default async function CategoryRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const next = new URLSearchParams();
  next.set("department", slug);
  for (const [key, value] of Object.entries(query)) {
    if (value) next.set(key, value);
  }

  redirect(`/shop?${next.toString()}`);
}

import { redirect } from "next/navigation";

/**
 * /categories/[slug] (subcategory browsing, e.g. "dresses") forwards to
 * the redesigned /shop catalog with the category facet pre-applied —
 * same reasoning as /category/[slug]: one PLP implementation, not two.
 */
export default async function SubcategoryRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const next = new URLSearchParams();
  next.set("category", slug);
  for (const [key, value] of Object.entries(query)) {
    if (value) next.set(key, value);
  }

  redirect(`/shop?${next.toString()}`);
}

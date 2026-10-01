import Link from "next/link";
import { api } from "@/lib/api";
import ShopProductGrid from "@/components/ShopProductGrid";
import ShopFilters from "@/components/ShopFilters";
import type { Category, Brand, Department, ProductListItem, AgeGroup, AgeGroupStage } from "@/lib/types";

const GENDER_LABEL: Record<string, string> = { girls: "Girls", boys: "Boys", unisex: "Unisex" };
const DEPARTMENT_LABEL: Record<string, string> = { women: "Women", men: "Men", kids: "Kids", baby: "Babies" };
const STAGE_LABEL: Record<string, string> = { baby: "Babies", kids: "Kids", teens: "Teens" };
const VALID_STAGES: AgeGroupStage[] = ["baby", "kids", "teens"];

const BAND_IMG: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
  men: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=2071&auto=format&fit=crop",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const stage = VALID_STAGES.includes(params.stage as AgeGroupStage) ? (params.stage as AgeGroupStage) : undefined;
  const sort = params.sort || "-created_at";
  const department = params.department || "";

  const productParams: Record<string, string> = { ordering: sort };
  if (department) productParams.department = department;
  if (params.gender) productParams.gender = params.gender;
  if (params.age_group) productParams.age_group = params.age_group;
  if (stage) productParams.stage = stage;
  if (params.price_range) productParams.price_range = params.price_range;
  if (params.size) productParams.size = params.size;
  if (params.category) productParams.category = params.category;
  if (params.brand) productParams.brand = params.brand;
  if (params.on_sale) productParams.on_sale = params.on_sale;

  const facetParams: Record<string, string> = { has_products: "true" };
  if (department) facetParams.department = department;
  if (params.gender) facetParams.gender = params.gender;
  if (params.age_group) facetParams.age_group = params.age_group;
  if (stage) facetParams.stage = stage;

  const isAdultDept = department === "men" || department === "women";

  const [productsData, categoriesData, brandsData, ageGroupsData, departmentsData, deptCategoriesData] = await Promise.all([
    api.products(productParams).catch(() => ({ results: [] as ProductListItem[], count: 0 })),
    api.categories(facetParams).catch(() => ({ results: [] as Category[], count: 0 })),
    api.brands(facetParams).catch(() => ({ results: [] as Brand[], count: 0 })),
    stage ? api.ageGroupsByStage(stage).catch(() => ({ stage, age_groups: [] as AgeGroup[], count: 0 })) : Promise.resolve({ stage: "", age_groups: [] as AgeGroup[], count: 0 }),
    api.departments().catch(() => [] as Department[]),
    isAdultDept ? api.categories({ department, page_size: "300" }).catch(() => ({ results: [] as Category[], count: 0 })) : Promise.resolve({ results: [] as Category[], count: 0 }),
  ]);

  const products = productsData.results || [];
  const totalCount = productsData.count ?? products.length;
  const categories = categoriesData.results || [];
  const brands = brandsData.results || [];
  const stageAgeGroups = (ageGroupsData.age_groups || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const currentDepartment = department ? departmentsData.find((d: Department) => d.slug === department) : undefined;
  const deptLabel = department ? currentDepartment?.name || DEPARTMENT_LABEL[department] || department : "";
  const categoryLabel = params.category
    ? (deptCategoriesData.results || []).find((c) => c.slug === params.category)?.name || categories.find((c) => c.slug === params.category)?.name || ""
    : "";
  const heading = [deptLabel, categoryLabel, stage ? STAGE_LABEL[stage] : null, params.gender ? GENDER_LABEL[params.gender] : null].filter(Boolean).join(" ") || "All Products";

  function withParams(overrides: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    if (department) next.department = department;
    if (stage) next.stage = stage;
    if (params.gender) next.gender = params.gender;
    if (params.age_group) next.age_group = params.age_group;
    if (params.category) next.category = params.category;
    if (params.sort) next.sort = params.sort;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete next[k]; else next[k] = v;
    }
    return `?${new URLSearchParams(next).toString()}`;
  }

  const activeFilterCount = ["gender", "age_group", "price_range", "size", "category", "brand", "on_sale"].filter((k) => params[k]).length;

  return (
    <main className="bg-white text-black font-sans min-h-screen">
      {/* Slim department band — image only for adult depts */}
      {isAdultDept && (
        <div className="relative h-40 lg:h-56 overflow-hidden">
          <img src={BAND_IMG[department]} alt={heading} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-end container-shell pb-5">
            <h1 className="font-editorial text-3xl lg:text-5xl text-white tracking-wide">{heading}</h1>
          </div>
        </div>
      )}

      <div className="container-shell pt-8 pb-4">
        {/* {!isAdultDept && (
          <div className="flex items-end justify-between mb-6">
            <h1 className="font-editorial text-3xl lg:text-4xl tracking-tight">{heading}</h1>
            <span className="text-[11px] text-stone-500 uppercase tracking-widest">{totalCount} Items</span>
          </div>
        )}
        {isAdultDept && (
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] text-stone-500 uppercase tracking-widest">{totalCount} Items</span>
          </div>
        )} */}

        {/* Underline-style category nav — Zara, not pill boxes */}
        {/* <nav className="flex gap-6 overflow-x-auto border-b border-stone-200">
          <Link href={withParams({ category: undefined })} className={`pb-3 text-[11px] uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px transition ${!params.category ? "border-black text-black font-medium" : "border-transparent text-stone-500 hover:text-black"}`}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c.slug} href={withParams({ category: c.slug })} className={`pb-3 text-[11px] uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px transition ${params.category === c.slug ? "border-black text-black font-medium" : "border-transparent text-stone-500 hover:text-black"}`}>
              {c.name}
            </Link>
          ))}
        </nav> */}
      </div>

      <ShopFilters
        categories={categories}
        brands={brands}
        ageGroups={stageAgeGroups}
        showGender={!isAdultDept}
        totalCount={totalCount}
        sort={sort}
      />

      <div className="container-shell py-8">
        <div>
          <div className="w-full">
            {products.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-stone-200">
                <p className="text-stone-600 text-sm">No products match these filters.</p>
              </div>
            ) : (
              <ShopProductGrid initialProducts={products} totalCount={totalCount} productParams={productParams} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
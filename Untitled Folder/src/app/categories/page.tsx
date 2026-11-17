import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import type { Department } from "@/lib/types";

const FALLBACK: Record<string, string> = {
  women:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",

  men:
    "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=2071&auto=format&fit=crop",

  baby:
    "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=2070&auto=format&fit=crop",

  kids:
    "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=2070&auto=format&fit=crop",
};

const DEPARTMENT_ORDER = ["women", "men", "kids", "baby"];

type DepartmentWithId = Department & {
  id: number;
};

type DepartmentMedia = {
  id?: number;
  file?: string;
  file_url?: string;
  image?: string;
  image_url?: string;
  url?: string;
  media_url?: string;
  is_primary?: boolean;
};

function resolveMediaUrl(value?: string | null): string {
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return mediaUrl(value);
}

function extractMediaUrl(media: DepartmentMedia): string {
  return resolveMediaUrl(
    media.file_url ||
      media.image_url ||
      media.media_url ||
      media.file ||
      media.image ||
      media.url
  );
}

async function getDepartmentImage(
  department: DepartmentWithId
): Promise<string> {
  // ------------------------------------------------------------
  // 1. Try the primary image returned with the department
  // ------------------------------------------------------------
  if (department.primary_image?.file_url) {
    const url = resolveMediaUrl(department.primary_image.file_url);

    if (url) {
      return url;
    }
  }

  // ------------------------------------------------------------
  // 2. Get the actual media attached to this department
  // ------------------------------------------------------------
  try {
    const response = await api.departmentMedia(department.id);

    console.log(
      `[Collections] Media for ${department.name}:`,
      response
    );

    let media: DepartmentMedia[] = [];

    if (Array.isArray(response)) {
      media = response;
    } else if (Array.isArray(response?.results)) {
      media = response.results;
    } else if (Array.isArray(response?.media)) {
      media = response.media;
    } else if (Array.isArray(response?.media_files)) {
      media = response.media_files;
    } else if (Array.isArray(response?.files)) {
      media = response.files;
    }

    if (media.length > 0) {
      // Prefer the media marked as primary.
      const primary =
        media.find((item) => item.is_primary === true) ||
        media[0];

      const url = extractMediaUrl(primary);

      if (url) {
        return url;
      }
    }
  } catch (error) {
    console.error(
      `[Collections] Failed to load media for ${department.name}:`,
      error
    );
  }

  // ------------------------------------------------------------
  // 3. Temporary hard fallback using the exact backend files
  // ------------------------------------------------------------
  //
  // These are the files confirmed in your Django admin.
  //
  if (department.slug === "baby") {
    return resolveMediaUrl(
      "/media/departments/media/image_72c3f6b1.jpg"
    );
  }

  if (department.slug === "kids") {
    return resolveMediaUrl(
      "/media/departments/media/download.jpeg"
    );
  }

  // ------------------------------------------------------------
  // 4. Final fallback
  // ------------------------------------------------------------
  return (
    FALLBACK[department.slug.toLowerCase()] ||
    FALLBACK.kids
  );
}

export default async function CategoriesPage() {
  const departments = (await api
    .departments()
    .catch(() => [])) as DepartmentWithId[];

  const departmentsWithImages = await Promise.all(
    departments.map(async (department) => ({
      department,
      image: await getDepartmentImage(department),
    }))
  );

  // --------------------------------------------------------------
  // Storefront order
  // --------------------------------------------------------------
  const sortedDepartments = [...departmentsWithImages].sort(
    (a, b) => {
      const aIndex = DEPARTMENT_ORDER.indexOf(
        a.department.slug.toLowerCase()
      );

      const bIndex = DEPARTMENT_ORDER.indexOf(
        b.department.slug.toLowerCase()
      );

      if (aIndex === -1 && bIndex === -1) {
        return a.department.name.localeCompare(
          b.department.name
        );
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    }
  );

  return (
    <main className="min-h-screen bg-white font-sans text-black">
      <div className="container-shell py-12">
        <h1 className="mb-10 font-editorial text-4xl">
          Collections
        </h1>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {sortedDepartments.map(({ department, image }) => (
            <Link
              key={department.slug}
              href={`/shop?department=${encodeURIComponent(
                department.slug
              )}`}
              className="group relative block aspect-[3/4] overflow-hidden"
            >
              <img
                src={image}
                alt={`${department.name} collection`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/25" />

              <div className="absolute inset-0 flex items-end justify-center pb-8 text-white">
                <h2 className="font-editorial text-2xl tracking-wide">
                  {department.name}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
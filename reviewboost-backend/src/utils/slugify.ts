import { Restaurant } from '../models/Restaurant';

export function toSlug(name: string, city?: string): string {
  const combined =
    city && !name.toLowerCase().includes(city.toLowerCase()) ? `${name} ${city}` : name;

  return combined
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function generateUniqueSlug(
  name: string,
  city?: string,
  excludeId?: string,
): Promise<string> {
  const base = toSlug(name, city);
  let candidate = base;
  let counter = 2;

  while (true) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query['_id'] = { $ne: excludeId };

    const existing = await Restaurant.findOne(query).lean();
    if (!existing) return candidate;

    candidate = `${base}-${counter}`;
    counter++;
  }
}

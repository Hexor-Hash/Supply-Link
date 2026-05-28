export const TAXONOMY_VERSION = '1.0.0';

export interface TaxonomySubcategory {
  id: string;
  label: string;
}

export interface TaxonomyCategory {
  id: string;
  label: string;
  subcategories: TaxonomySubcategory[];
}

export const PRODUCT_TAXONOMY: TaxonomyCategory[] = [
  {
    id: 'agricultural',
    label: 'Agricultural Products',
    subcategories: [
      { id: 'coffee', label: 'Coffee' },
      { id: 'cocoa', label: 'Cocoa' },
      { id: 'tea', label: 'Tea' },
      { id: 'grains', label: 'Grains & Cereals' },
      { id: 'fruits', label: 'Fruits & Vegetables' },
      { id: 'spices', label: 'Spices & Herbs' },
      { id: 'oilseeds', label: 'Oilseeds' },
      { id: 'sugar', label: 'Sugar & Sweeteners' },
    ],
  },
  {
    id: 'textiles',
    label: 'Textiles & Apparel',
    subcategories: [
      { id: 'cotton', label: 'Cotton' },
      { id: 'wool', label: 'Wool' },
      { id: 'silk', label: 'Silk' },
      { id: 'synthetic', label: 'Synthetic Fibres' },
      { id: 'leather', label: 'Leather & Hides' },
      { id: 'apparel', label: 'Finished Apparel' },
    ],
  },
  {
    id: 'food_beverage',
    label: 'Food & Beverage',
    subcategories: [
      { id: 'dairy', label: 'Dairy Products' },
      { id: 'meat', label: 'Meat & Poultry' },
      { id: 'seafood', label: 'Seafood' },
      { id: 'processed', label: 'Processed Foods' },
      { id: 'beverages', label: 'Beverages' },
      { id: 'confectionery', label: 'Confectionery' },
    ],
  },
  {
    id: 'pharmaceuticals',
    label: 'Pharmaceuticals & Healthcare',
    subcategories: [
      { id: 'medicines', label: 'Medicines' },
      { id: 'vaccines', label: 'Vaccines' },
      { id: 'medical_devices', label: 'Medical Devices' },
      { id: 'supplements', label: 'Supplements' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Technology',
    subcategories: [
      { id: 'consumer_electronics', label: 'Consumer Electronics' },
      { id: 'components', label: 'Components & Parts' },
      { id: 'semiconductors', label: 'Semiconductors' },
      { id: 'batteries', label: 'Batteries & Energy' },
    ],
  },
  {
    id: 'minerals',
    label: 'Minerals & Raw Materials',
    subcategories: [
      { id: 'precious_metals', label: 'Precious Metals' },
      { id: 'industrial_metals', label: 'Industrial Metals' },
      { id: 'gemstones', label: 'Gemstones' },
      { id: 'coal', label: 'Coal & Fossil Fuels' },
      { id: 'timber', label: 'Timber & Wood' },
    ],
  },
  {
    id: 'chemicals',
    label: 'Chemicals & Materials',
    subcategories: [
      { id: 'industrial_chemicals', label: 'Industrial Chemicals' },
      { id: 'polymers', label: 'Polymers & Plastics' },
      { id: 'fertilizers', label: 'Fertilizers' },
      { id: 'paints', label: 'Paints & Coatings' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    subcategories: [
      { id: 'general', label: 'General Merchandise' },
      { id: 'luxury', label: 'Luxury Goods' },
      { id: 'art', label: 'Art & Collectibles' },
    ],
  },
];

export function getCategoryById(id: string): TaxonomyCategory | undefined {
  return PRODUCT_TAXONOMY.find((c) => c.id === id);
}

export function getSubcategoryById(
  categoryId: string,
  subcategoryId: string,
): TaxonomySubcategory | undefined {
  return getCategoryById(categoryId)?.subcategories.find((s) => s.id === subcategoryId);
}

export function isValidCategory(categoryId: string): boolean {
  return PRODUCT_TAXONOMY.some((c) => c.id === categoryId);
}

export function isValidSubcategory(categoryId: string, subcategoryId: string): boolean {
  return !!getSubcategoryById(categoryId, subcategoryId);
}

export function getCategoryLabel(categoryId: string): string {
  return getCategoryById(categoryId)?.label ?? categoryId;
}

export function getSubcategoryLabel(categoryId: string, subcategoryId: string): string {
  return getSubcategoryById(categoryId, subcategoryId)?.label ?? subcategoryId;
}

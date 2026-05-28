import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { Product } from "@/lib/types";

/** Standalone product card extracted from the products list page. */
const meta: Meta = {
  title: "Products/ProductCard",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="max-w-xs">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold leading-tight">{product.name}</h2>
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
              product.active
                ? "bg-green-500/10 text-green-500"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {product.active ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">Origin: {product.origin}</p>
        <p className="text-xs text-gray-400 mt-1 font-mono truncate">ID: {product.id}</p>
      </CardHeader>
      <CardContent>
        <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
          QR Code
        </div>
      </CardContent>
    </Card>
  );
}

const baseProduct: Product = {
  id: "prod-a1b2c3d4",
  name: "Arabica Coffee Beans",
  origin: "Yirgacheffe, Ethiopia",
  owner: "GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  timestamp: Date.now(),
  active: true,
  authorizedActors: [],
};

export const Active: Story = {
  render: () => <ProductCard product={baseProduct} />,
};

export const Inactive: Story = {
  render: () => <ProductCard product={{ ...baseProduct, active: false }} />,
};

export const LongName: Story = {
  render: () => (
    <ProductCard
      product={{
        ...baseProduct,
        name: "Single-Origin Fair-Trade Organic Arabica Coffee Beans — Premium Grade",
      }}
    />
  ),
};

export const PharmaceuticalProduct: Story = {
  render: () => (
    <ProductCard
      product={{
        ...baseProduct,
        id: "med-rx-00421",
        name: "Amoxicillin 500mg",
        origin: "Pfizer, Kalamazoo MI",
      }}
    />
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-4">
      <ProductCard product={baseProduct} />
      <ProductCard product={{ ...baseProduct, id: "prod-b2c3d4e5", name: "Silk Fabric", origin: "Suzhou, China" }} />
      <ProductCard product={{ ...baseProduct, id: "prod-c3d4e5f6", name: "Conflict-Free Cobalt", origin: "DRC Certified Mine", active: false }} />
    </div>
  ),
};

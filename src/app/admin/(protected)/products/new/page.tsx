import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Add New Product</h1>
        <p className="text-sm text-stone-600 mt-1">Fill in the details to create a new product</p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
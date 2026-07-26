import { notFound } from "next/navigation";
import { getProductByIdAdmin } from "@/lib/queries/products";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductByIdAdmin(id);
  if (!product) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Edit Product</h1>
        <p className="text-sm text-stone-600 mt-1">Update {product.name}</p>
      </div>
      <ProductForm product={product} mode="edit" />
    </div>
  );
}

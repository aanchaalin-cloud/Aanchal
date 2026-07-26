import Link from "next/link";
import Image from "next/image";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import { getAllProductsAdmin } from "@/lib/queries/products";
import { Messages } from "@/lib/messages";
import { formatPrice, getPrimaryImageUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProductsAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Products</h1>
          <p className="text-sm text-stone-600 mt-1">{products.length} total products</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-300 rounded-sm">
          <p className="text-stone-600 mb-4">{Messages.noAdminProducts}</p>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" />
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <table className="min-w-full divide-y divide-stone-100">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Variants</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((product) => {
                const imageUrl = getPrimaryImageUrl(product.product_images);
                const totalStock = product.product_variants.reduce(
                  (sum, v) => sum + v.stock,
                  0
                );
                return (
                  <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 flex-shrink-0 overflow-hidden rounded-sm bg-stone-100">
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-stone-600">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">{product.category}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{formatPrice(product.price)}</p>
                        {product.discount_price && (
                          <p className="text-xs text-stone-600 line-through">{formatPrice(product.discount_price)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-stone-600">{product.product_variants.length} variants</p>
                      <p className="text-xs text-stone-600">{totalStock} total stock</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          product.is_active ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"
                        }`}>
                          {product.is_active ? "Active" : "Hidden"}
                        </span>
                        {product.is_featured && (
                          <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                          title="View on store"
                        >
                          {product.is_active ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                          title="Edit product"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
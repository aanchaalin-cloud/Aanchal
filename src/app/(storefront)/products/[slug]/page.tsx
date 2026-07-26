import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActiveProducts,
  getActiveProductBySlug,
  getRelatedProducts,
} from "@/lib/queries/products";
import type { ProductWithDetails } from "@/types";
import { ProductDetail } from "@/components/product/ProductDetail";
import { StorefrontErrorState } from "@/components/ui/StorefrontState";
import { Messages } from "@/lib/messages";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getActiveProductBySlug(slug);
  const product = result.data;

  if (!product) {
    return { title: "Product Not Found" };
  }

  const displayPrice = product.discount_price ?? product.price;
  const ogImage = product.product_images?.[0]?.url;
  const ogDescription = product.description
    ? `${product.description} — ₹${displayPrice.toLocaleString("en-IN")}`
    : `Shop ${product.name} at Aanchal — ₹${displayPrice.toLocaleString("en-IN")}`;

  return {
    title: product.name,
    description: product.description ?? `Shop ${product.name} at Aanchal`,
    openGraph: {
      title: `${product.name} | Aanchal`,
      description: ogDescription,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 1600, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Aanchal`,
      description: ogDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

function jsonLd(product: ProductWithDetails) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://aanchal.in";
  const displayPrice = product.discount_price ?? product.price;
  const image = product.product_images?.[0]?.url;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: image ?? undefined,
    category: product.category,
    offers: {
      "@type": "Offer",
      price: displayPrice,
      priceCurrency: "INR",
      availability: product.product_variants?.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${siteUrl}/products/${product.slug}`,
    },
  };
}

export async function generateStaticParams() {
  try {
    const products = await getActiveProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export const revalidate = 60;

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getActiveProductBySlug(slug);

  if (result.error === "PRODUCT_NOT_FOUND") {
    notFound();
  }
  if (result.data === null) {
    return (
      <StorefrontErrorState
        title="Product unavailable"
        message={Messages.productNotFound}
      />
    );
  }

  const product = result.data;
  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category,
    4
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(product)) }}
      />
      <ProductDetail product={product} relatedProducts={relatedProducts} />
    </>
  );
}

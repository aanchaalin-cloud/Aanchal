export interface ProductImageRef {
  url: string;
  position: number;
  id?: string;
  alt_text?: string | null;
}

export function getSortedImages(images: ProductImageRef[]): ProductImageRef[] {
  return [...images].sort((a, b) => a.position - b.position);
}

/**
 * All product images, sorted by position — used for the product gallery.
 */
export function getStorefrontImages(images: ProductImageRef[]): ProductImageRef[] {
  return getSortedImages(images);
}

/**
 * First image (position 0) for a product — used for static product cards
 * (Shop grid, Most Loved, wishlist) and product meta/OG images.
 */
export function getPrimaryStorefrontImage(images: ProductImageRef[]): string | null {
  return getSortedImages(images)[0]?.url ?? null;
}

/**
 * Image positions 0 and 1 are the first/second images. The homepage slideshow
 * (second section) must only surface the 3rd, 4th, 5th… images (positions 2+).
 */
export const SLIDESHOW_IMAGE_MIN_POSITION = 2;

/**
 * Slideshow images for the homepage second section — only images from
 * position 2 onward (skips the 1st and 2nd images). If a product has no
 * such images it falls back to any available one so cards never go blank.
 */
export function getSlideshowImages(images: ProductImageRef[]): ProductImageRef[] {
  const sorted = getSortedImages(images);
  const startingFromThird = sorted.filter(
    (img) => img.position >= SLIDESHOW_IMAGE_MIN_POSITION,
  );
  return startingFromThird.length > 0 ? startingFromThird : sorted;
}

/**
 * Primary slideshow image for a product — the 3rd image (position 2) when
 * available, falling back to any available image.
 */
export function getPrimarySlideshowImage(images: ProductImageRef[]): string | null {
  return getSlideshowImages(images)[0]?.url ?? null;
}

"use client";

import Image from "next/image";
import Link from "next/link";

type CollectionItem = {
  name: string;
  image: string;
  href: string;
};

function CollectionCard({
  item,
  priority,
}: {
  item: CollectionItem;
  priority?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="group relative w-[260px] flex-shrink-0 sm:w-[300px] lg:w-[320px]"
      aria-label={`View ${item.name}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#FFF0E8] ring-1 ring-[#E5D5C5]/60 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
        <Image
          src={item.image}
          alt={item.name}
          fill
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 260px, (max-width: 1024px) 300px, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className="inline-block rounded-full bg-white/90 px-5 py-1.5 text-sm font-semibold text-[#800020] shadow-md backdrop-blur-sm">
            View Collection
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-lg font-medium text-[#1C1C1C] transition-colors group-hover:text-[#800020]">
          {item.name}
        </h3>
      </div>
    </Link>
  );
}

export function CollectionsScroller({ collections }: { collections: CollectionItem[] }) {
  return (
    <>
      {/* Mobile: touch-swipeable horizontal scroll */}
      <div className="lg:hidden overflow-x-auto scrollbar-hidden -mx-4 px-4">
        <div className="flex gap-4 pb-4" style={{ scrollSnapType: "x mandatory" }}>
          {collections.map((item, idx) => (
            <div key={item.image} style={{ scrollSnapAlign: "start" }}>
              <CollectionCard item={item} priority={idx < 3} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: auto-scrolling marquee */}
      <div className="hidden lg:block marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-6 pr-6" aria-hidden={copy === 1}>
            {collections.map((item, idx) => (
              <CollectionCard
                key={`${item.image}-${copy}`}
                item={item}
                priority={copy === 0 && idx < 3}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

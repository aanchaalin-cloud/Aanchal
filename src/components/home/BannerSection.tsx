export function BannerSection() {
  return (
    <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
      <div className="absolute inset-0 bg-[#95271D]" />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A843]/80">
              Crafted with Love
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight text-[#D4A843] sm:text-5xl">
              Where Every Thread Tells a Story
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#D4A843]/70">
              From the looms of India to your wardrobe — each piece carries the legacy of artisans who&rsquo;ve perfected their craft over generations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

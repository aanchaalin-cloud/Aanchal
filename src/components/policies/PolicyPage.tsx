import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function PolicyPage({
  eyebrow,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="bg-[#800020]">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A843]">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            {title}
          </h1>
          <div className="mt-5 h-px w-24 bg-[#D4A843]" />
          {lastUpdated && (
            <p className="mt-4 text-xs text-[#FFF8F3]/70">Last updated: {lastUpdated}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

export function PolicyCard({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#E5D5C5]/60 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2.5 font-serif text-lg font-semibold text-[#1C1C1C]">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0E8] text-[#800020]">
            {icon}
          </span>
        )}
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#6B6B6B]">
        {children}
      </div>
    </section>
  );
}

export function PolicyList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2.5">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A843]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

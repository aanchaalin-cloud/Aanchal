import { StorefrontLayout } from "@/components/layout/StorefrontLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}

import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackgroundGraphics } from "./BackgroundGraphics";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { LazyFloatingVideo } from "@/components/ui/LazyFloatingVideo";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundGraphics />
      <Header />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
      <CartDrawer />
      <LazyFloatingVideo />
    </>
  );
}

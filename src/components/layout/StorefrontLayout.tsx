import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackgroundGraphics } from "./BackgroundGraphics";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { FloatingVideo } from "@/components/ui/FloatingVideo";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundGraphics />
      <Header />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
      <CartDrawer />
      <FloatingVideo />
    </>
  );
}

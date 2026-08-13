import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackgroundGraphics } from "./BackgroundGraphics";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { StorefrontMain } from "./StorefrontMain";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundGraphics />
      <Header />
      <StorefrontMain>{children}</StorefrontMain>
      <Footer />
      <CartDrawer />
    </>
  );
}

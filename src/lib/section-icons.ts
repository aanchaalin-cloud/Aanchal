import {
  Ruler,
  Scissors,
  Sparkles,
  Gift,
  Users,
  Megaphone,
  Bell,
  Instagram,
  Mail,
  Star,
  Truck,
  Heart,
  ShoppingBag,
  BadgeCheck,
  Palette,
  CircleCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Ruler,
  Scissors,
  Sparkles,
  Gift,
  Users,
  Megaphone,
  Bell,
  Instagram,
  Mail,
  Star,
  Truck,
  Heart,
  ShoppingBag,
  BadgeCheck,
  Palette,
  CircleCheck,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getSectionIcon(name?: string | null): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Sparkles;
}

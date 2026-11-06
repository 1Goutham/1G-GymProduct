import {
  LayoutGrid,
  Radio,
  Users,
  Dumbbell,
  Wrench,
  ShoppingBag,
  Wallet,
  Sparkles,
  Fingerprint,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  key: string;
  group: "Operate" | "Assets" | "Business" | "System";
}

export const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: LayoutGrid, key: "t", group: "Operate" },
  { href: "/live", label: "Live floor", icon: Radio, key: "l", group: "Operate" },
  { href: "/trainers", label: "Trainers", icon: UserRound, key: "r", group: "Operate" },
  { href: "/members", label: "Members", icon: Users, key: "m", group: "Operate" },
  { href: "/equipment", label: "Equipment", icon: Dumbbell, key: "e", group: "Assets" },
  { href: "/service", label: "Service", icon: Wrench, key: "s", group: "Assets" },
  { href: "/procurement", label: "Procurement", icon: ShoppingBag, key: "p", group: "Assets" },
  { href: "/finance", label: "Finance", icon: Wallet, key: "f", group: "Business" },
  { href: "/copilot", label: "Copilot", icon: Sparkles, key: "a", group: "Business" },
  { href: "/devices", label: "Biometrics", icon: Fingerprint, key: "d", group: "System" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

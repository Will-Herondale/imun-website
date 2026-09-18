/** Top-level navigation structure for the site. */

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export const navItems: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Conference", href: "/conference" },
  { label: "Committees", href: "/committees" },
  { label: "Registration", href: "/registration" },
  { label: "Allocations", href: "/allocations" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const registerHref = "/registration";
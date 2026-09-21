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

/**
 * Secondary links shown in the footer only (the top nav is already full at the
 * large breakpoint).
 */
export const secondaryNavItems: NavItem[] = [
  { label: "Updates", href: "/updates" },
  { label: "Executive Board", href: "/eb" },
];

export const registerHref = "/registration";
'use client';

import { usePathname } from 'next/navigation';
import SiteNavbar from '@/components/SiteNavbar';

export default function FrontendNavbarMount() {
  const pathname = usePathname();

  if (!pathname) return null;
  if (pathname.startsWith('/admin')) return null;

  return <SiteNavbar />;
}

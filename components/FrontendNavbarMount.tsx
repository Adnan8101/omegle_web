'use client';
import SiteNavbar from '@/components/SiteNavbar';
import { usePathname } from 'next/navigation';
export default function FrontendNavbarMount() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (pathname.startsWith('/admin')) return null;
  if (pathname === '/shop') return null;
  return <SiteNavbar />;
}
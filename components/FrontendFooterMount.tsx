'use client';
import SiteFooter from '@/components/SiteFooter';
import { usePathname } from 'next/navigation';
export default function FrontendFooterMount() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (pathname.startsWith('/admin')) return null;
  return <SiteFooter />;
}
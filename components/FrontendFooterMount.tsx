'use client';
import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/SiteFooter';
export default function FrontendFooterMount() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (pathname.startsWith('/admin')) return null;
  return <SiteFooter />;
}
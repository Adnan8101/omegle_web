'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeAwareBackground() {
  const { theme } = useTheme();

  if (theme !== 'light') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-sky-300/10 rounded-full filter blur-3xl opacity-55 animate-float" />
      <div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-blue-300/10 rounded-full filter blur-3xl opacity-55 animate-float" style={{ animationDelay: '2s' }} />
    </div>
  );
}

'use client';

// The gambling module's motion primitives now live in the shared site-wide module so the whole
// app animates from one system. Re-exported here to keep existing gambling imports stable.
export { Reveal, RevealGroup, Item, CountUp, Parallax } from '@/components/motion';

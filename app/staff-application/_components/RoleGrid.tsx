'use client';

import { FiAlertTriangle } from 'react-icons/fi';
import { Item, Reveal, RevealGroup } from '@/components/motion';
import { STAFF_ROLES, type StaffRole } from '@/lib/staffApplicationForm';
import RoleCard from './RoleCard';

interface RoleFormSetting {
  isOpen: boolean;
  closedMessage?: string;
}

interface RoleGridProps {
  roleForms: Record<StaffRole, RoleFormSetting>;
  closedNotice: string;
  onSelect: (role: StaffRole) => void;
}

export default function RoleGrid({ roleForms, closedNotice, onSelect }: RoleGridProps) {
  return (
    <section id="roles" className="scroll-mt-28">
      <Reveal dir="up" distance={18} className="mb-7 text-center">
        <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-white sm:text-[26px]">Choose a role</h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-white/45">
          You can only submit one application at a time — pick the role that fits best.
        </p>
      </Reveal>

      {closedNotice && (
        <Reveal dir="up" distance={12} className="mx-auto mb-6 flex max-w-lg items-start gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3.5">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
          <p className="text-[13px] leading-relaxed text-amber-200">{closedNotice}</p>
        </Reveal>
      )}

      <RevealGroup stagger={0.08} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {STAFF_ROLES.map((role) => (
          <Item key={role.id} distance={20} scale={0.97}>
            <RoleCard
              role={role}
              isOpen={roleForms[role.id]?.isOpen ?? true}
              onSelect={() => onSelect(role.id)}
            />
          </Item>
        ))}
      </RevealGroup>
    </section>
  );
}

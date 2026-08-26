import type { IconType } from 'react-icons';
import { FaCrown } from 'react-icons/fa';
import { FiShield, FiUsers } from 'react-icons/fi';
import type { DepartmentId } from '../types';

/** Rank glyphs — kept out of `types.ts` so that file stays data-only. */
export const TIER_ICONS: Record<DepartmentId, IconType> = {
  founders: FaCrown,
  admins: FiShield,
  core_team: FiUsers,
};

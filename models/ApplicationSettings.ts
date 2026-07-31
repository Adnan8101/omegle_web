import mongoose, { Schema, Model } from 'mongoose';
import { StaffRole } from '@/lib/staffApplicationForm';
export interface IRoleFormSetting {
  isOpen: boolean;
  closedMessage?: string;
}
export interface IApplicationSettings {
  _id?: string;
  isOpen: boolean;
  closedMessage?: string;
  roleForms?: Partial<Record<StaffRole, IRoleFormSetting>>;
  updatedAt: Date;
}
const RoleFormSettingSchema = new Schema<IRoleFormSetting>(
  {
    isOpen: { type: Boolean, default: true },
    closedMessage: { type: String, default: '' },
  },
  { _id: false }
);
const ApplicationSettingsSchema = new Schema<IApplicationSettings>(
  {
    isOpen: { type: Boolean, default: true },
    closedMessage: {
      type: String,
      default: 'Staff applications are currently closed. Please check back later.'
    },
    roleForms: {
      moderation: { type: RoleFormSettingSchema, default: () => ({ isOpen: true, closedMessage: '' }) },
      event_team: { type: RoleFormSettingSchema, default: () => ({ isOpen: true, closedMessage: '' }) },
      gaming_mod: { type: RoleFormSettingSchema, default: () => ({ isOpen: true, closedMessage: '' }) },
      media_team: { type: RoleFormSettingSchema, default: () => ({ isOpen: true, closedMessage: '' }) },
    },
  },
  {
    timestamps: true,
  }
);
const ApplicationSettings: Model<IApplicationSettings> =
  mongoose.models.ApplicationSettings ||
  mongoose.model<IApplicationSettings>('ApplicationSettings', ApplicationSettingsSchema);
export default ApplicationSettings;
import mongoose, { Schema, Model } from 'mongoose';

export interface IApplicationSettings {
  _id?: string;
  isOpen: boolean;
  closedMessage?: string;
  updatedAt: Date;
}

const ApplicationSettingsSchema = new Schema<IApplicationSettings>(
  {
    isOpen: { type: Boolean, default: true },
    closedMessage: { 
      type: String, 
      default: 'Staff applications are currently closed. Please check back later.' 
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

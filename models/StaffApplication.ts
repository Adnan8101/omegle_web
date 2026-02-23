import mongoose, { Schema, Model } from 'mongoose';

export interface IStaffApplication {
  _id?: string;
  // Discord & Personal Info
  discordUsername: string;
  discordUserId: string;
  country: string;
  timezone: string;
  age: string;
  
  // General Questions
  aboutYourself: string;
  whyJoin: string;
  hoursPerWeek: string;
  languages: string;
  vcAvailability: string;
  vcFrequency: string;
  
  // Moderation Questions
  moderationExperience: string;
  moderatorDefinition: string;
  leadershipExperience: string;
  
  // Bot Experience
  discordBotExperience: string;
  automodKnowledge: string;
  moderationBotsFamiliarity: string;
  modCommandsKnowledge: string;
  
  status: 'pending' | 'considered' | 'denied';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

const StaffApplicationSchema = new Schema<IStaffApplication>(
  {
    // Discord & Personal Info
    discordUsername: { type: String, required: true },
    discordUserId: { type: String, required: true },
    country: { type: String, required: true },
    timezone: { type: String, required: true },
    age: { type: String, required: true },
    
    // General Questions
    aboutYourself: { type: String, required: true },
    whyJoin: { type: String, required: true },
    hoursPerWeek: { type: String, required: true },
    languages: { type: String, required: true },
    vcAvailability: { type: String, required: true },
    vcFrequency: { type: String, required: false },
    
    // Moderation Questions
    moderationExperience: { type: String, required: true },
    moderatorDefinition: { type: String, required: true },
    leadershipExperience: { type: String, required: true },
    
    // Bot Experience
    discordBotExperience: { type: String, required: true },
    automodKnowledge: { type: String, required: true },
    moderationBotsFamiliarity: { type: String, required: true },
    modCommandsKnowledge: { type: String, required: true },
    
    status: {
      type: String,
      enum: ['pending', 'considered', 'denied'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

const StaffApplication: Model<IStaffApplication> =
  mongoose.models.StaffApplication ||
  mongoose.model<IStaffApplication>('StaffApplication', StaffApplicationSchema);

export default StaffApplication;

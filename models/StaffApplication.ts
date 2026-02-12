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
  
  // Moderation Questions
  moderationExperience: string;
  moderatorDefinition: string;
  handlingToxicity: string;
  conflictResolution: string;
  
  // Bot & Technical Questions
  discordBotExperience: string;
  technicalSkills: string;
  automodTools: string;
  
  // Situation-Based Questions
  spamScenario: string;
  raidScenario: string;
  controversialTopic: string;
  teamDisagreement: string;
  
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
    
    // Moderation Questions
    moderationExperience: { type: String, required: true },
    moderatorDefinition: { type: String, required: true },
    handlingToxicity: { type: String, required: true },
    conflictResolution: { type: String, required: true },
    
    // Bot & Technical Questions
    discordBotExperience: { type: String, required: true },
    technicalSkills: { type: String, required: true },
    automodTools: { type: String, required: true },
    
    // Situation-Based Questions
    spamScenario: { type: String, required: true },
    raidScenario: { type: String, required: true },
    controversialTopic: { type: String, required: true },
    teamDisagreement: { type: String, required: true },
    
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

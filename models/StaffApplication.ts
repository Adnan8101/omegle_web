import mongoose, { Schema, Model } from 'mongoose';

export interface IStaffApplication {
  _id?: string;
  applicationRole?: 'moderation' | 'event_team' | 'gaming_mod' | 'media_team' | 'entertainment_team';
  dailyAvailability?: string;
  roleAnswers?: Record<string, string>;
  formVersion?: number;

  // Discord & Personal Info
  discordUsername?: string;
  discordUserId?: string;
  country?: string;
  timezone?: string;
  age?: string;
  
  // General Questions
  aboutYourself?: string;
  whyJoin?: string;
  hoursPerWeek?: string;
  languages?: string;
  vcAvailability?: string;
  vcFrequency?: string;
  
  // Moderation Questions
  moderationExperience?: string;
  moderatorDefinition?: string;
  leadershipExperience?: string;
  
  // Bot Experience
  discordBotExperience?: string;
  automodKnowledge?: string;
  moderationBotsFamiliarity?: string;
  modCommandsKnowledge?: string;
  
  status: 'pending' | 'considered' | 'denied';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  
  // Fetched user data
  userProfile?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
    in_guild?: boolean;
    nickname?: string;
  } | null;
  userStats?: {
    vc_duration?: number;
    vc_sessions?: number;
    message_count?: number;
  } | null;
  modLogs?: Array<{
    action_type?: string;
    reason?: string;
    moderator_id?: string;
    created_at?: string;
  }>;
  dataFetchedAt?: Date;
}

const StaffApplicationSchema = new Schema<IStaffApplication>(
  {
    applicationRole: {
      type: String,
      enum: ['moderation', 'event_team', 'gaming_mod', 'media_team', 'entertainment_team'],
      default: 'moderation',
    },
    dailyAvailability: { type: String, required: false },
    roleAnswers: { type: Schema.Types.Mixed, default: {} },
    formVersion: { type: Number, default: 1 },

    // Discord & Personal Info
    discordUsername: { type: String, required: false },
    discordUserId: { type: String, required: false },
    country: { type: String, required: false },
    timezone: { type: String, required: false },
    age: { type: String, required: false },
    
    // General Questions
    aboutYourself: { type: String, required: false },
    whyJoin: { type: String, required: false },
    hoursPerWeek: { type: String, required: false },
    languages: { type: String, required: false },
    vcAvailability: { type: String, required: false },
    vcFrequency: { type: String, required: false },
    
    // Moderation Questions
    moderationExperience: { type: String, required: false },
    moderatorDefinition: { type: String, required: false },
    leadershipExperience: { type: String, required: false },
    
    // Bot Experience
    discordBotExperience: { type: String, required: false },
    automodKnowledge: { type: String, required: false },
    moderationBotsFamiliarity: { type: String, required: false },
    modCommandsKnowledge: { type: String, required: false },
    
    status: {
      type: String,
      enum: ['pending', 'considered', 'denied'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
    
    // Fetched user data
    userProfile: { type: Schema.Types.Mixed, default: null },
    userStats: { type: Schema.Types.Mixed, default: null },
    modLogs: { type: [Schema.Types.Mixed], default: [] },
    dataFetchedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

StaffApplicationSchema.index({ status: 1, createdAt: -1 });
StaffApplicationSchema.index({ applicationRole: 1, createdAt: -1 });
StaffApplicationSchema.index({ discordUserId: 1, createdAt: -1 });

const StaffApplication: Model<IStaffApplication> =
  mongoose.models.StaffApplication ||
  mongoose.model<IStaffApplication>('StaffApplication', StaffApplicationSchema);

export default StaffApplication;

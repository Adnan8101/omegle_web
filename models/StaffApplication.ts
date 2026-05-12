import mongoose, { Schema, Model } from 'mongoose';

export interface IStaffApplication {
  _id?: string;
  applicationRole?: 'moderation' | 'event_team' | 'gaming_mod' | 'media_team' | 'entertainment_team';
  dailyAvailability?: string;
  roleAnswers?: Record<string, string>;
  formVersion?: number;

  discordUsername?: string;
  discordUserId?: string;
  country?: string;
  timezone?: string;
  age?: string;
  
  aboutYourself?: string;
  whyJoin?: string;
  hoursPerWeek?: string;
  languages?: string;
  vcAvailability?: string;
  vcFrequency?: string;
  
  moderationExperience?: string;
  moderatorDefinition?: string;
  leadershipExperience?: string;
  
  discordBotExperience?: string;
  automodKnowledge?: string;
  moderationBotsFamiliarity?: string;
  modCommandsKnowledge?: string;
  
  status: 'pending' | 'considered' | 'denied';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  
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
  modLogs?: Array<Record<string, unknown>>;
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

    discordUsername: { type: String, required: false },
    discordUserId: { type: String, required: false },
    country: { type: String, required: false },
    timezone: { type: String, required: false },
    age: { type: String, required: false },
    
    aboutYourself: { type: String, required: false },
    whyJoin: { type: String, required: false },
    hoursPerWeek: { type: String, required: false },
    languages: { type: String, required: false },
    vcAvailability: { type: String, required: false },
    vcFrequency: { type: String, required: false },
    
    moderationExperience: { type: String, required: false },
    moderatorDefinition: { type: String, required: false },
    leadershipExperience: { type: String, required: false },

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

    userProfile: { type: Schema.Types.Mixed, default: null },
    userStats: { type: Schema.Types.Mixed, default: null },
    modLogs: { type: [Schema.Types.Mixed], default: [] } as any,
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

import mongoose, { Document, Schema, Types } from 'mongoose';

export const BUSINESS_TYPES = ['restaurant', 'salon', 'spa', 'clinic', 'gym', 'hotel', 'other'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_CONFIG: Record<
  BusinessType,
  { label: string; question: string; serviceLabel: string; experience: string }
> = {
  restaurant: { label: 'Restaurant', question: 'How was your meal?',        serviceLabel: 'dishes',     experience: 'dining'       },
  salon:      { label: 'Salon',      question: 'How was your experience?',  serviceLabel: 'services',   experience: 'salon'        },
  spa:        { label: 'Spa',        question: 'How was your session?',     serviceLabel: 'treatments', experience: 'spa'          },
  clinic:     { label: 'Clinic',     question: 'How was your visit?',       serviceLabel: 'services',   experience: 'healthcare'   },
  gym:        { label: 'Gym',        question: 'How was your session?',     serviceLabel: 'facilities', experience: 'fitness'      },
  hotel:      { label: 'Hotel',      question: 'How was your stay?',        serviceLabel: 'amenities',  experience: 'hospitality'  },
  other:      { label: 'Business',   question: 'How was your experience?',  serviceLabel: 'services',   experience: 'service'      },
};

export interface IRestaurant {
  name: string;
  slug: string;
  businessType: BusinessType;
  services: string[];
  description?: string;
  // Optional detail fields — filled in via owner dashboard after signup
  cuisine?: string;
  city?: string;
  state?: string;
  googleMapsUrl?: string;
  googleReviewUrl?: string;
  zomatoUrl?: string;
  logoColor: string;
  logoUrl?: string;
  ownerEmail: string;
  ownerPhone?: string;
  taxConfig?: {
    gstEnabled: boolean;
    cgst: number;
    sgst: number;
    useIgst: boolean;
    igst: number;
    serviceChargeEnabled: boolean;
    serviceCharge: number;
  };
  plan: 'trial' | 'basic' | 'pro';
  trialEndsAt?: Date;
  isActive: boolean;
  billingPin?: string;
  upiId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRestaurantDocument extends IRestaurant, Document {
  _id: Types.ObjectId;
}

const RestaurantSchema = new Schema<IRestaurantDocument>(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, required: true, unique: true, lowercase: true },
    businessType: { type: String, required: true, enum: BUSINESS_TYPES, default: 'restaurant' },
    services:     { type: [String], default: [] },
    description:  { type: String },
    cuisine:      { type: String, trim: true },
    city:         { type: String, trim: true },
    state:        { type: String, trim: true },
    googleMapsUrl:   { type: String },
    googleReviewUrl: { type: String },
    zomatoUrl:       { type: String },
    logoColor:    { type: String, default: '#6366f1' },
    logoUrl:      { type: String },
    ownerEmail:   { type: String, required: true, lowercase: true },
    ownerPhone:   { type: String },
    taxConfig: {
      gstEnabled:           { type: Boolean, default: false },
      cgst:                 { type: Number, default: 2.5 },
      sgst:                 { type: Number, default: 2.5 },
      useIgst:              { type: Boolean, default: false },
      igst:                 { type: Number, default: 5 },
      serviceChargeEnabled: { type: Boolean, default: false },
      serviceCharge:        { type: Number, default: 10 },
    },
    plan:         { type: String, enum: ['trial', 'basic', 'pro'], default: 'trial' },
    trialEndsAt:  { type: Date },
    isActive:     { type: Boolean, default: true },
    billingPin:   { type: String, select: false },
    upiId:        { type: String, trim: true },
  },
  { timestamps: true },
);

RestaurantSchema.index({ isActive: 1 });
RestaurantSchema.index({ ownerEmail: 1 });

export const Restaurant = mongoose.model<IRestaurantDocument>('Restaurant', RestaurantSchema);

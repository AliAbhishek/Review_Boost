import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomer {
  restaurantId: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  visitDate: Date;
  notes?: string;
  // Email campaign tracking
  emailSentAt?: Date;
  emailToken?: string;
  emailClickedAt?: Date;
  // Review completion
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerDocument extends ICustomer, Document {
  _id: Types.ObjectId;
}

const CustomerSchema = new Schema<ICustomerDocument>(
  {
    restaurantId:    { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name:            { type: String, required: true, trim: true },
    email:           { type: String, required: true, lowercase: true, trim: true },
    phone:           { type: String },
    visitDate:       { type: Date, required: true },
    notes:           { type: String },
    emailSentAt:     { type: Date },
    emailToken:      { type: String },
    emailClickedAt:  { type: Date },
    reviewedAt:      { type: Date },
  },
  { timestamps: true },
);

CustomerSchema.index({ restaurantId: 1, createdAt: -1 });
CustomerSchema.index({ emailToken: 1 }, { sparse: true });

export const Customer = mongoose.model<ICustomerDocument>('Customer', CustomerSchema);

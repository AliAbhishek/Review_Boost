import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOwner {
  email: string;
  passwordHash: string;
  restaurantId: Types.ObjectId;
  name: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface IOwnerDocument extends IOwner, Document {
  _id: Types.ObjectId;
}

const OwnerSchema = new Schema<IOwnerDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

OwnerSchema.index({ restaurantId: 1 });

export const Owner = mongoose.model<IOwnerDocument>('Owner', OwnerSchema);

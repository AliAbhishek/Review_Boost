import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAdmin {
  name: string;
  email: string;
  passwordHash: string;
  lastLogin?: Date;
  createdAt: Date;
}

export interface IAdminDocument extends IAdmin, Document {
  _id: Types.ObjectId;
}

const AdminSchema = new Schema<IAdminDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

export const Admin = mongoose.model<IAdminDocument>('Admin', AdminSchema);

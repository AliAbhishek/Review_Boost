import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVoucher {
  restaurantId: Types.ObjectId;
  isActive: boolean;
  title: string;       // "10% off your next visit"
  discountText: string; // "10% OFF" or "Free Coffee"
  description: string;  // "Show this to the staff"
  code: string;         // "THANKS10"
  expiryDays: number;
  claimedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVoucherDocument extends IVoucher, Document {
  _id: Types.ObjectId;
}

const VoucherSchema = new Schema<IVoucherDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    isActive:     { type: Boolean, default: true },
    title:        { type: String, required: true },
    discountText: { type: String, required: true },
    description:  { type: String, default: 'Show this to the staff on your next visit' },
    code:         { type: String, required: true },
    expiryDays:   { type: Number, default: 30 },
    claimedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Voucher = mongoose.model<IVoucherDocument>('Voucher', VoucherSchema);

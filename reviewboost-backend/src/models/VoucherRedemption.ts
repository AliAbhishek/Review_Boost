import mongoose, { Document, Schema, Types } from 'mongoose';

export type RedemptionStatus = 'earned' | 'used' | 'expired';

export interface IVoucherRedemption {
  restaurantId:   Types.ObjectId;
  voucherId:      Types.ObjectId;
  customerId?:    Types.ObjectId;
  customerName:   string;
  customerEmail:  string;
  code:           string;           // unique personalized code, e.g. THANKS10-A3F9
  discountPercent: number;          // snapshot from voucher at time of issue
  status:         RedemptionStatus;
  sourceBillId?:  Types.ObjectId;   // which bill triggered the review
  redeemedBillId?: Types.ObjectId;  // which bill it was applied on
  discountApplied?: number;         // actual ₹ saved when redeemed
  earnedAt:       Date;
  expiresAt:      Date;
  redeemedAt?:    Date;
}

export interface IVoucherRedemptionDocument extends IVoucherRedemption, Document {
  _id: Types.ObjectId;
}

const VoucherRedemptionSchema = new Schema<IVoucherRedemptionDocument>(
  {
    restaurantId:    { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    voucherId:       { type: Schema.Types.ObjectId, ref: 'Voucher',     required: true },
    customerId:      { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName:    { type: String, required: true },
    customerEmail:   { type: String, required: true },
    code:            { type: String, required: true, unique: true },
    discountPercent: { type: Number, required: true },
    status:          { type: String, enum: ['earned', 'used', 'expired'], default: 'earned' },
    sourceBillId:    { type: Schema.Types.ObjectId, ref: 'Bill' },
    redeemedBillId:  { type: Schema.Types.ObjectId, ref: 'Bill' },
    discountApplied: { type: Number },
    earnedAt:        { type: Date, default: Date.now },
    expiresAt:       { type: Date, required: true },
    redeemedAt:      { type: Date },
  },
  { timestamps: true },
);

VoucherRedemptionSchema.index({ restaurantId: 1, status: 1 });
VoucherRedemptionSchema.index({ code: 1 }, { unique: true });

export const VoucherRedemption = mongoose.model<IVoucherRedemptionDocument>('VoucherRedemption', VoucherRedemptionSchema);

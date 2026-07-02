import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBillItem {
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ITaxLine {
  label: string;
  rate: number;
  amount: number;
}

export interface IVoucherApplied {
  code:           string;
  discountPercent: number;
  discountAmount: number;
  redemptionId:   Types.ObjectId;
  customerName:   string;
}

export interface IBill {
  restaurantId: Types.ObjectId;
  receiptNumber: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: IBillItem[];
  subtotal: number;
  taxLines: ITaxLine[];
  totalTax: number;
  grandTotal: number;          // final amount = subtotal + tax - voucherDiscount
  voucherApplied?: IVoucherApplied;
  emailToken?:  string;    // token sent in the review-request email for this bill
  reviewedAt?:  Date;      // set when customer submits review via this bill's token
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillDocument extends IBill, Document {
  _id: Types.ObjectId;
}

const BillSchema = new Schema<IBillDocument>(
  {
    restaurantId:  { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    receiptNumber: { type: String, required: true },
    customer: {
      name:  { type: String, required: true },
      email: { type: String },
      phone: { type: String },
    },
    items: [
      {
        name:     { type: String, required: true },
        price:    { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true },
      },
    ],
    subtotal:   { type: Number, required: true },
    taxLines: [
      {
        label:  { type: String },
        rate:   { type: Number },
        amount: { type: Number },
      },
    ],
    totalTax:   { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true },
    voucherApplied: {
      code:            { type: String },
      discountPercent: { type: Number },
      discountAmount:  { type: Number },
      redemptionId:    { type: Schema.Types.ObjectId, ref: 'VoucherRedemption' },
      customerName:    { type: String },
    },
    emailToken: { type: String, index: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

BillSchema.index({ restaurantId: 1, createdAt: -1 });

export const Bill = mongoose.model<IBillDocument>('Bill', BillSchema);

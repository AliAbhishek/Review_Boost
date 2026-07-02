import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMenuItem {
  restaurantId: Types.ObjectId;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;   // set when a discount is active; restored on removal
  discountPercent?: number; // 1-100 while offer is live
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuItemDocument extends IMenuItem, Document {
  _id: Types.ObjectId;
}

const MenuItemSchema = new Schema<IMenuItemDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name:         { type: String, required: true, trim: true },
    category:     { type: String, trim: true, default: 'Main' },
    price:           { type: Number, required: true, min: 0 },
    originalPrice:   { type: Number },
    discountPercent: { type: Number, min: 0, max: 100 },
    isAvailable:     { type: Boolean, default: true },
  },
  { timestamps: true },
);

MenuItemSchema.index({ restaurantId: 1, category: 1 });

export const MenuItem = mongoose.model<IMenuItemDocument>('MenuItem', MenuItemSchema);

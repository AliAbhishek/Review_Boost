import mongoose, { Document, Schema, Types } from 'mongoose';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'billed' | 'cancelled';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface IOrder {
  restaurantId: Types.ObjectId;
  tableNumber?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  items: IOrderItem[];
  subtotal: number;
  status: OrderStatus;
  orderedBy: 'staff' | 'customer';
  staffName?: string;
  billId?: Types.ObjectId;
  kotNumber: string; // Kitchen Order Ticket
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderDocument extends IOrder, Document {
  _id: Types.ObjectId;
}

const OrderSchema = new Schema<IOrderDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableNumber:  { type: String, trim: true },
    customer: {
      name:  { type: String, required: true },
      phone: { type: String },
      email: { type: String },
    },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        name:       { type: String, required: true },
        price:      { type: Number, required: true },
        quantity:   { type: Number, required: true, min: 1 },
        subtotal:   { type: Number, required: true },
        notes:      { type: String },
      },
    ],
    subtotal:   { type: Number, required: true },
    status:     { type: String, enum: ['pending', 'preparing', 'ready', 'billed', 'cancelled'], default: 'pending' },
    orderedBy:  { type: String, enum: ['staff', 'customer'], default: 'staff' },
    staffName:  { type: String, trim: true },
    billId:     { type: Schema.Types.ObjectId, ref: 'Bill' },
    kotNumber:  { type: String, required: true },
    notes:      { type: String },
  },
  { timestamps: true },
);

OrderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, createdAt: -1 });

export const Order = mongoose.model<IOrderDocument>('Order', OrderSchema);

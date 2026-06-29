import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReviewLog {
  restaurantId: Types.ObjectId;
  stars: 1 | 2 | 3 | 4 | 5;
  reviewText: string;
  wasEdited: boolean;
  submittedTo: 'google' | 'zomato' | 'private';
  customerIp?: string;
  timestamp: Date;
}

export interface IReviewLogDocument extends IReviewLog, Document {
  _id: Types.ObjectId;
}

const ReviewLogSchema = new Schema<IReviewLogDocument>({
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  stars: {
    type: Number,
    required: true,
    enum: [1, 2, 3, 4, 5],
  },
  reviewText: { type: String, required: true },
  wasEdited: { type: Boolean, default: false },
  submittedTo: {
    type: String,
    required: true,
    enum: ['google', 'zomato', 'private'],
  },
  customerIp: { type: String },
  timestamp: { type: Date, default: Date.now },
});

ReviewLogSchema.index({ restaurantId: 1, timestamp: -1 });
ReviewLogSchema.index({ restaurantId: 1, submittedTo: 1 });

export const ReviewLog = mongoose.model<IReviewLogDocument>(
  'ReviewLog',
  ReviewLogSchema,
);

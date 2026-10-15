import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 300 },
    // Running totals, updated together with every sale / payment so they never drift.
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    dueBalance: { type: Number, default: 0, min: 0 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ business: 1, isArchived: 1, name: 1 });
schema.index({ business: 1, phone: 1 });
schema.index({ business: 1, dueBalance: -1 });

export default mongoose.model('Customer', schema);

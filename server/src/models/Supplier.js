import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    company: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 200 },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    dueBalance: { type: Number, default: 0, min: 0 }, // what we owe the supplier
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ business: 1, isArchived: 1, name: 1 });

export default mongoose.model('Supplier', schema);

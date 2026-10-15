import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, trim: true, maxlength: 40 },
    category: { type: String, trim: true, maxlength: 60, default: 'General' },
    unit: { type: String, default: 'pcs' },
    buyPrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    // Products are archived, never hard-deleted, so old invoices and reports keep working.
    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
  },
  { timestamps: true },
);

schema.index({ business: 1, isArchived: 1, name: 1 });
schema.index({ business: 1, sku: 1 }, { unique: true, partialFilterExpression: { isArchived: false } });

export default mongoose.model('Product', schema);

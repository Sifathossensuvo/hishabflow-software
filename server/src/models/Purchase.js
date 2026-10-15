import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    reference: { type: String, maxlength: 60 },
    items: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        unitCost: { type: Number, required: true },
        lineTotal: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    paid: { type: Number, default: 0 },
    due: { type: Number, default: 0 },
    method: { type: String, enum: ['cash', 'bkash', 'nagad', 'bank'], default: 'cash' },
    note: { type: String, maxlength: 300 },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

schema.index({ business: 1, supplier: 1, date: -1 });

export default mongoose.model('Purchase', schema);

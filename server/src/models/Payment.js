import mongoose from 'mongoose';

// Money received from a customer (baki collection) or paid to a supplier.
const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    kind: { type: String, enum: ['customer', 'supplier'], required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    partyName: String,
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ['cash', 'bkash', 'nagad', 'bank'], default: 'cash' },
    note: { type: String, maxlength: 200 },
    allocations: [{ _id: false, ref: mongoose.Schema.Types.ObjectId, amount: Number }],
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

schema.index({ business: 1, kind: 1, date: -1 });
schema.index({ business: 1, customer: 1, date: -1 });
schema.index({ business: 1, supplier: 1, date: -1 });

export default mongoose.model('Payment', schema);

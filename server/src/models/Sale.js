import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    sku: String,
    unit: String,
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    unitCost: { type: Number, default: 0 }, // snapshot so profit stays correct when prices change later
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    invoiceNo: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: 'Walk-in customer' },
    customerPhone: String,
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paid: { type: Number, default: 0 },
    due: { type: Number, default: 0 },
    profit: { type: Number, default: 0 }, // total - cost of goods
    paymentMethod: { type: String, enum: ['cash', 'bkash', 'nagad', 'bank'], default: 'cash' },
    note: { type: String, maxlength: 300 },
    status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
    cancelledAt: Date,
    cancelReason: String,
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

schema.index({ business: 1, invoiceNo: 1 }, { unique: true });
schema.index({ business: 1, status: 1, date: -1 });
schema.index({ business: 1, customer: 1, date: -1 });

export default mongoose.model('Sale', schema);

import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    type: { type: String, enum: ['opening', 'in', 'out', 'adjust', 'sale', 'sale_cancel', 'purchase'], required: true },
    quantity: { type: Number, required: true }, // signed: + adds stock, - removes stock
    stockAfter: { type: Number, required: true },
    note: { type: String, maxlength: 200 },
    ref: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

schema.index({ business: 1, date: -1 });
schema.index({ business: 1, product: 1, date: -1 });

export default mongoose.model('StockMovement', schema);

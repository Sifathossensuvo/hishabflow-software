import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Electricity & Gas', 'Transport', 'Mobile & Internet',
  'Marketing', 'Repair & Maintenance', 'Tax & Fees', 'Packaging', 'Other',
];

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'Other' },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ['cash', 'bkash', 'nagad', 'bank'], default: 'cash' },
    note: { type: String, maxlength: 300 },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

schema.index({ business: 1, date: -1 });

export default mongoose.model('Expense', schema);

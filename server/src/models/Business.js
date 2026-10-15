import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    address: { type: String, trim: true, maxlength: 300 },
    currency: { type: String, default: 'BDT' },
    language: { type: String, enum: ['bn', 'en'], default: 'en' },
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    planExpiresAt: Date,
    invoice: {
      prefix: { type: String, default: 'INV', maxlength: 8 },
      nextNumber: { type: Number, default: 1 },
      footerNote: { type: String, default: 'Thank you for your business.', maxlength: 200 },
      terms: { type: String, default: '', maxlength: 300 },
      accentColor: { type: String, default: '#0B7A57' },
    },
    notifications: {
      lowStock: { type: Boolean, default: true },
      dueReminder: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export default mongoose.model('Business', schema);

import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('Branch', schema);

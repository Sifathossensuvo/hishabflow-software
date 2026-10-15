// Fills a demo business with realistic data. Run: npm run seed
// Everything goes through the same services the app uses, so stock, baki and invoices stay consistent.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { Branch, Business, Customer, Expense, Payment, Product, Purchase, Sale, StockMovement, Supplier, User } from './models/index.js';
import { receiveCustomerPayment } from './services/payments.js';
import { createPurchase } from './services/purchases.js';
import { createSale } from './services/sales.js';
import { addDays, startOfDayBD } from './utils/dates.js';

const EMAIL = 'demo@hisabflow.app';
const PASSWORD = 'demo1234';

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => Math.floor(a + rnd() * (b - a + 1));

const PRODUCTS = [
  ['Miniket Rice', 'Grocery', 'kg', 68, 76], ['Chinigura Rice', 'Grocery', 'kg', 105, 118], ['Soybean Oil 5L', 'Grocery', 'pcs', 840, 890],
  ['Soybean Oil 1L', 'Grocery', 'pcs', 172, 185], ['Masoor Dal', 'Grocery', 'kg', 98, 110], ['Sugar', 'Grocery', 'kg', 118, 128],
  ['ACI Pure Salt 1kg', 'Grocery', 'packet', 38, 45], ['Radhuni Turmeric 200g', 'Spices', 'packet', 92, 105], ['Radhuni Chili Powder 200g', 'Spices', 'packet', 110, 125],
  ['Pran Chanachur', 'Snacks', 'packet', 22, 30], ['Bombay Sweets Chips', 'Snacks', 'packet', 18, 25], ['Olympic Energy Biscuit', 'Snacks', 'packet', 14, 20],
  ['Mojo 2L', 'Drinks', 'pcs', 78, 90], ['Pran Frooto 250ml', 'Drinks', 'pcs', 17, 25], ['Speed Energy Drink', 'Drinks', 'pcs', 32, 40],
  ['Lux Soap', 'Home care', 'pcs', 45, 55], ['Wheel Washing Powder 1kg', 'Home care', 'packet', 128, 145], ['Harpic Toilet Cleaner', 'Home care', 'pcs', 148, 170],
  ['Dettol Handwash', 'Home care', 'pcs', 98, 120], ['Parachute Coconut Oil 250ml', 'Personal care', 'pcs', 118, 135], ['Closeup Toothpaste', 'Personal care', 'pcs', 82, 98],
  ['Sunsilk Shampoo Sachet', 'Personal care', 'pcs', 3, 5], ['Eggs', 'Fresh', 'dozen', 128, 145], ['Pran Milk 1L', 'Fresh', 'pcs', 88, 98],
  ['Aarong Ghee 200g', 'Dairy', 'pcs', 285, 320], ['Marks Full Cream Milk Powder 500g', 'Dairy', 'pcs', 560, 610], ['Ruchi Mustard Oil 500ml', 'Grocery', 'pcs', 168, 185],
  ['Notebook (200 pages)', 'Stationery', 'pcs', 48, 65], ['Matador Pen (box)', 'Stationery', 'box', 95, 120],
];
const CUSTOMERS = [
  ['Abdul Karim', '01711223344', 'Mirpur 10, Dhaka'], ['Rahima Begum', '01819334455', 'Mirpur 11, Dhaka'], ['Md. Sohel Rana', '01912445566', 'Pallabi, Dhaka'],
  ['Nasrin Akter', '01613556677', 'Mirpur 12, Dhaka'], ['Jahangir Alam', '01714667788', 'Kafrul, Dhaka'], ['Shirin Sultana', '01515778899', 'Mirpur 6, Dhaka'],
  ['Mizanur Rahman', '01816889900', 'Mirpur 2, Dhaka'], ['Taslima Khatun', '01917990011', 'Pallabi, Dhaka'], ['Kamal Hossain', '01318001122', 'Mirpur 10, Dhaka'],
  ['Farhana Yesmin', '01719112233', 'Mirpur 13, Dhaka'], ['Rubel Mia', '01820223344', 'Kafrul, Dhaka'], ['Salma Khatun', '01621334455', 'Mirpur 1, Dhaka'],
];
const SUPPLIERS = [
  ['Haji Mostafa', 'Mostafa Traders', '01711000111', 'Chawkbazar, Dhaka'], ['Alamgir Hossain', 'Bismillah Wholesale', '01811000222', 'Mouchak, Dhaka'],
  ['Rafiq Uddin', 'Rafiq Distribution (Pran-RFL)', '01911000333', 'Tejgaon, Dhaka'], ['Sumon Das', 'City Stationery', '01611000444', 'Nilkhet, Dhaka'],
];
const METHODS = ['cash', 'cash', 'cash', 'bkash', 'bkash', 'nagad', 'bank'];

async function wipe() {
  const u = await User.findOne({ email: EMAIL });
  if (!u) return;
  const f = { business: u.business };
  await Promise.all([Product, Customer, Sale, Payment, Expense, Supplier, Purchase, StockMovement, Branch].map((M) => M.deleteMany(f)));
  await User.deleteMany(f);
  await Business.deleteOne({ _id: u.business });
}

async function main() {
  await mongoose.connect(env.mongoUri);
  await wipe();

  const business = await Business.create({ name: 'Rahim Store', phone: '01711000999', email: 'rahimstore@example.com', address: '12/B Mirpur Road, Mirpur 10, Dhaka 1216', plan: 'business', planExpiresAt: addDays(new Date(), 30) });
  const owner = await User.create({ business: business._id, name: 'Abdur Rahim', email: EMAIL, phone: '01711000999', role: 'owner', passwordHash: await bcrypt.hash(PASSWORD, 12) });
  await User.create({ business: business._id, name: 'Sabbir (staff)', email: 'staff@hisabflow.app', role: 'staff', passwordHash: await bcrypt.hash(PASSWORD, 12) });
  await Branch.create({ business: business._id, name: 'Mirpur 10 (Main)', address: 'Mirpur 10, Dhaka' });
  const bid = business._id;
  const biz = () => Business.findById(bid).lean();

  const products = await Product.insertMany(PRODUCTS.map(([name, category, unit, buyPrice, sellPrice], i) => ({
    business: bid, name, category, unit, buyPrice, sellPrice, sku: `HF-${String(i + 1).padStart(3, '0')}`, stock: 0, lowStockThreshold: unit === 'kg' ? 25 : 8,
  })));
  const customers = await Customer.insertMany(CUSTOMERS.map(([name, phone, address]) => ({ business: bid, name, phone, address })));
  const suppliers = await Supplier.insertMany(SUPPLIERS.map(([name, company, phone, address]) => ({ business: bid, name, company, phone, address })));

  // Opening stock bought from suppliers 50 days ago (some on credit)
  const start = addDays(startOfDayBD(), -50);
  for (let i = 0; i < suppliers.length; i++) {
    const mine = products.filter((_, idx) => idx % suppliers.length === i);
    const items = mine.map((p) => ({ productId: String(p._id), qty: p.unit === 'kg' ? 300 : 90, unitCost: p.buyPrice }));
    const total = items.reduce((s, x) => s + x.qty * x.unitCost, 0);
    await createPurchase({ businessId: bid, userId: owner._id, input: { supplierId: String(suppliers[i]._id), items, paid: Math.round(total * (i % 2 ? 0.6 : 1)), method: 'bank', date: start, note: 'Opening stock', updateBuyPrice: false } });
  }

  // 45 days of sales
  for (let d = 45; d >= 0; d--) {
    const day = addDays(startOfDayBD(), -d);
    const count = between(3, 9) + (new Date(day.getTime() + 6 * 3600000).getUTCDay() === 5 ? 3 : 0);
    for (let s = 0; s < count; s++) {
      const lines = between(1, 4);
      const chosen = new Map();
      for (let l = 0; l < lines; l++) {
        const p = pick(products);
        chosen.set(String(p._id), { productId: String(p._id), qty: p.unit === 'kg' ? between(1, 5) : between(1, 3) });
      }
      const useCustomer = rnd() < 0.55;
      const customer = useCustomer ? pick(customers) : null;
      const onCredit = customer && rnd() < 0.28;
      const date = new Date(day.getTime() + between(9, 21) * 3600000 + between(0, 59) * 60000);
      try {
        const approx = [...chosen.values()].reduce((sum, i) => sum + i.qty * products.find((p) => String(p._id) === i.productId).sellPrice, 0);
        const discount = rnd() < 0.15 ? Math.round(approx * 0.05) : 0;
        await createSale({
          business: await biz(), userId: rnd() < 0.7 ? owner._id : undefined,
          input: {
            items: [...chosen.values()], customerId: customer ? String(customer._id) : undefined, discount,
            paid: onCredit ? Math.round((approx - discount) * 0.4) : undefined, method: pick(METHODS), date, note: undefined,
          },
        });
      } catch (err) {
        if (err.code !== 'INSUFFICIENT_STOCK') throw err;
      }
    }
    // Restock halfway so the shop never runs fully dry
    if (d === 22) {
      const sup = suppliers[0];
      const items = products.slice(0, 12).map((p) => ({ productId: String(p._id), qty: p.unit === 'kg' ? 150 : 40, unitCost: p.buyPrice }));
      await createPurchase({ businessId: bid, userId: owner._id, input: { supplierId: String(sup._id), items, paid: 0, method: 'cash', date: day, note: 'Restock on credit', updateBuyPrice: false } });
    }
    // Some customers pay part of their baki
    if (d % 6 === 0) {
      const debtors = await Customer.find({ business: bid, dueBalance: { $gt: 0 } }).lean();
      if (debtors.length) {
        const c = pick(debtors);
        await receiveCustomerPayment({ businessId: bid, userId: owner._id, customerId: String(c._id), amount: Math.min(c.dueBalance, Math.max(50, Math.round(c.dueBalance * 0.5))), method: pick(['cash', 'bkash']), note: 'Baki collection', date: new Date(day.getTime() + 15 * 3600000) });
      }
    }
    // Expenses
    const dayNum = Number(new Date(day.getTime() + 6 * 3600000).toISOString().slice(8, 10));
    const ex = [];
    if (dayNum === 1) ex.push(['Shop rent', 'Rent', 18000], ['Staff salary', 'Salary', 14000]);
    if (dayNum === 8) ex.push(['Electricity bill', 'Electricity & Gas', 2650], ['Internet bill', 'Mobile & Internet', 800]);
    if (rnd() < 0.35) ex.push([pick(['Van fare', 'Delivery rickshaw', 'Tea & snacks', 'Polybag packets']), pick(['Transport', 'Packaging', 'Other']), between(60, 450)]);
    if (d === 3) ex.push(['Emergency freezer repair', 'Repair & Maintenance', 6500]);
    for (const [title, category, amount] of ex) await Expense.create({ business: bid, title, category, amount, method: 'cash', date: new Date(day.getTime() + 10 * 3600000), createdBy: owner._id });
  }

  // A few products running low so alerts have something to show
  for (const name of ['Soybean Oil 5L', 'Eggs', 'Pran Milk 1L']) {
    const p = await Product.findOne({ business: bid, name });
    const left = name === 'Eggs' ? 2 : 4;
    await Product.updateOne({ _id: p._id }, { $set: { stock: left } });
    await StockMovement.create({ business: bid, product: p._id, productName: p.name, type: 'adjust', quantity: left - p.stock, stockAfter: left, note: 'Stock count corrected', createdBy: owner._id });
  }

  const [sales, due] = await Promise.all([Sale.countDocuments({ business: bid }), Customer.aggregate([{ $match: { business: bid } }, { $group: { _id: null, d: { $sum: '$dueBalance' } } }])]);
  console.log(`Seeded ${products.length} products, ${customers.length} customers, ${sales} sales. Total baki: ৳${due[0]?.d || 0}`);
  console.log(`Login: ${EMAIL} / ${PASSWORD}   (staff: staff@hisabflow.app / ${PASSWORD})`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

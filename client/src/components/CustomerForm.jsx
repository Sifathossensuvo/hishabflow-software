import { useState } from 'react';
import { api } from '../lib/api.js';
import { isBDPhone } from '../lib/validators.js';
import { useToast } from '../context/FeedbackContext.jsx';
import { Button, Input, Textarea } from './ui.jsx';

export default function CustomerForm({ customer, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: customer?.name || '', phone: customer?.phone || '', address: customer?.address || '', note: customer?.note || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!f.name.trim()) err.name = 'Enter the customer name';
    if (f.phone && !isBDPhone(f.phone)) err.phone = 'Enter a valid mobile number, like 017XXXXXXXX';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const res = customer ? await api.put(`/customers/${customer._id}`, f) : await api.post('/customers', f);
      toast.success(customer ? 'Customer updated' : 'Customer added');
      onSaved(res.data);
    } catch (ex) {
      if (ex.field) setErrors({ [ex.field]: ex.message }); else toast.error(ex.message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Name" value={f.name} onChange={set('name')} error={errors.name} required autoFocus />
      <Input label="Mobile number" type="tel" inputMode="tel" placeholder="017XXXXXXXX" value={f.phone} onChange={set('phone')} error={errors.phone} />
      <Input label="Address" value={f.address} onChange={set('address')} maxLength={200} />
      <Textarea label="Note" value={f.note} onChange={set('note')} maxLength={300} rows={2} />
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{customer ? 'Save changes' : 'Add customer'}</Button></div>
    </form>
  );
}

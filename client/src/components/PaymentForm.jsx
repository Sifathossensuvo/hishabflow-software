import { useState } from 'react';
import { api } from '../lib/api.js';
import { bdt, ymd } from '../lib/format.js';
import { useToast } from '../context/FeedbackContext.jsx';
import { Button, Input, MethodPicker } from './ui.jsx';

// Records money received from a customer, or paid to a supplier.
export default function PaymentForm({ endpoint, due, name, verb = 'Collect', onClose, onSaved }) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(ymd());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!amount || n <= 0) return setError('Enter an amount above 0');
    if (n > due + 0.001) return setError(`This is more than the ${bdt(due)} due`);
    setError('');
    setBusy(true);
    try {
      await api.post(endpoint, { amount: n, method, date, note });
      toast.success(`${bdt(n)} recorded`);
      onSaved();
    } catch (ex) { setError(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="rounded-lg bg-mist px-4 py-3"><p className="text-sm text-ink-mute">{name}</p><p className="num text-xl font-bold text-due-600">{bdt(due)} due</p></div>
      <Input label="Amount (৳)" type="number" inputMode="decimal" step="any" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} error={error} autoFocus
        hint={Number(amount) > 0 && Number(amount) < due ? `${bdt(due - Number(amount))} will still be due` : undefined} />
      <MethodPicker value={method} onChange={setMethod} />
      <Input label="Date" type="date" value={date} max={ymd()} onChange={(e) => setDate(e.target.value)} />
      <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={200} />
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{verb} {Number(amount) > 0 ? bdt(Number(amount)) : ''}</Button></div>
    </form>
  );
}

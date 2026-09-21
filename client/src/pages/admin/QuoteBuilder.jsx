import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileImage, Mail, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';
import { ShieldMark, Wordmark } from '../../components/brand/Logo';
import { BRAND_SLOGAN } from '../../content/brand';

const dollars = (cents) => (Number(cents || 0) / 100).toFixed(2);
const cents = (value) => Math.max(0, Math.round((Number(value) || 0) * 100));
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const futureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

function initialBuilder(quote) {
  const saved = quote.adminQuote || {};
  const estimate = quote.estimate;
  const defaultDescription = quote.productType === 'sticker'
    ? `${quote.specifications?.stickerSize || '3in'} custom full-color stickers`
    : quote.productType === 'tshirt'
      ? `Custom T-shirts · ${quote.specifications?.printLocations || 1} print location${quote.specifications?.printLocations === 1 ? '' : 's'}`
      : 'Custom production';
  const lineItems = saved.lineItems?.length
    ? saved.lineItems.map((item) => ({ ...item, unitPrice: dollars(item.unitPrice) }))
    : [{ description: defaultDescription, quantity: quote.quantity, unitPrice: dollars(estimate?.unitPrice) }];
  return {
    quoteNumber: saved.quoteNumber || `TKQ-${quote._id.slice(-6).toUpperCase()}`,
    lineItems,
    setupFee: dollars(saved.setupFee ?? estimate?.setup),
    shipping: dollars(saved.shipping),
    discount: dollars(saved.discount),
    taxRate: String(saved.taxRate || 0),
    validUntil: saved.validUntil || futureDate(),
    leadTime: saved.leadTime || '7–14 business days after art approval',
    paymentTerms: saved.paymentTerms || '50% deposit to begin production; balance due at pickup unless arranged otherwise.',
    customerMessage: saved.customerMessage || 'Thank you for the opportunity to make this with you. Final production begins after artwork and pricing approval.',
    internalNotes: saved.internalNotes || '',
    concepts: saved.concepts || [],
  };
}

export default function AdminQuoteBuilder() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [emailReady, setEmailReady] = useState(false);
  const [builder, setBuilder] = useState(null);
  const [conceptFiles, setConceptFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.adminGetQuote(id)
      .then(({ quote: result, emailDeliveryConfigured }) => { setQuote(result); setBuilder(initialBuilder(result)); setEmailReady(emailDeliveryConfigured); })
      .catch((error) => toast.error(error.message || 'Could not load this quote'));
  }, [id]);

  const totals = useMemo(() => {
    if (!builder) return { subtotal: 0, tax: 0, total: 0 };
    const items = builder.lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    const subtotal = items + (Number(builder.setupFee) || 0);
    const taxable = Math.max(0, subtotal + (Number(builder.shipping) || 0) - (Number(builder.discount) || 0));
    const tax = taxable * (Number(builder.taxRate) || 0) / 100;
    return { subtotal, tax, total: taxable + tax };
  }, [builder]);

  const pendingEdits = !quote || !builder || conceptFiles.length > 0 || JSON.stringify(builder) !== JSON.stringify(initialBuilder(quote));

  if (!quote || !builder) return <AdminLayout><div className="loading-page"><div className="spinner" /></div></AdminLayout>;

  const update = (field, value) => setBuilder((current) => ({ ...current, [field]: value }));
  const updateLine = (index, field, value) => update('lineItems', builder.lineItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const addLine = () => update('lineItems', [...builder.lineItems, { description: '', quantity: 1, unitPrice: '0.00' }]);
  const removeLine = (index) => builder.lineItems.length > 1 && update('lineItems', builder.lineItems.filter((_, itemIndex) => itemIndex !== index));

  const addConcepts = (files) => {
    const incoming = Array.from(files || []).slice(0, Math.max(0, 6 - conceptFiles.length)).map((file, index) => ({ file, preview: URL.createObjectURL(file), label: `Concept ${builder.concepts.length + conceptFiles.length + index + 1}`, notes: '' }));
    setConceptFiles((current) => [...current, ...incoming]);
  };

  const save = async () => {
    if (builder.lineItems.some((item) => !item.description.trim())) return toast.error('Every line item needs a description');
    setSaving(true);
    try {
      const payload = {
        ...builder,
        lineItems: builder.lineItems.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: cents(item.unitPrice) })),
        setupFee: cents(builder.setupFee), shipping: cents(builder.shipping), discount: cents(builder.discount), taxRate: Number(builder.taxRate) || 0,
      };
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      formData.append('conceptMetadata', JSON.stringify(conceptFiles.map(({ label, notes }) => ({ label, notes }))));
      conceptFiles.forEach(({ file }) => formData.append('conceptImages', file));
      const result = await api.adminSaveQuoteBuilder(id, formData);
      setQuote(result.quote);
      setBuilder(initialBuilder(result.quote));
      conceptFiles.forEach((file) => URL.revokeObjectURL(file.preview));
      setConceptFiles([]);
      toast.success('Quote builder saved');
    } catch (error) {
      toast.error(error.message || 'Could not save the quote');
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (pendingEdits) return toast.error('Save your latest quote changes before emailing the customer.');
    if (!quote.adminQuote?.lineItems?.length) return toast.error('Save the quote before sending it.');
    if (!window.confirm(`Send ${builder.quoteNumber} to ${quote.email}? This emails the full proposal and artwork concepts now.`)) return;
    setSending(true);
    try {
      const result = await api.adminSendQuoteProposal(id);
      setQuote(result.quote);
      setBuilder(initialBuilder(result.quote));
      toast.success(result.message || 'Quote sent');
    } catch (error) {
      toast.error(error.message || 'Could not send the quote email');
    } finally {
      setSending(false);
    }
  };

  const customerConcepts = [
    ...(quote.designPreviewUrl ? [{ label: 'Customer studio design', imageUrl: quote.designPreviewUrl, notes: 'Editable studio file attached to this request.' }] : []),
    ...builder.concepts,
    ...conceptFiles.map((file) => ({ label: file.label, imageUrl: file.preview, notes: file.notes })),
  ];

  return (
    <AdminLayout
      title="Quote Builder"
      description={`${quote.name} · ${quote.requestType === 'studio' ? 'Studio submission' : 'Quick request'}`}
      action={<div className="qb-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={save} disabled={saving || sending}><Save size={15} /> {saving ? 'Saving…' : 'Save quote'}</button><button type="button" className="btn btn-primary btn-sm" onClick={send} disabled={saving || sending || pendingEdits || !emailReady || !quote.adminQuote?.lineItems?.length} title={!emailReady ? 'Configure SMTP email credentials before sending directly' : pendingEdits ? 'Save changes before emailing' : undefined}><Mail size={15} /> {sending ? 'Sending…' : 'Email quote'}</button></div>}
    >
      <Link to="/admin/quotes" className="qb-back"><ArrowLeft size={14} /> Back to quotes</Link>
      <div className="qb-layout">
        <div className="qb-controls">
          <section className="card qb-section"><h2>Customer brief</h2><div className="qb-brief-grid"><span><small>Customer</small><strong>{quote.name}</strong></span><span><small>Email</small><a href={`mailto:${quote.email}`}>{quote.email}</a></span><span><small>Quantity</small><strong>{quote.quantity.toLocaleString()}</strong></span><span><small>Needed by</small><strong>{quote.neededBy || 'Flexible'}</strong></span></div><p className="qb-details">{quote.details}</p>{quote.estimate && <div className="qb-estimate"><span>Customer estimate</span><strong>{money(quote.estimate.low / 100)}–{money(quote.estimate.high / 100)}</strong><small>Starting estimate only · confirm materials and art before finalizing</small></div>}</section>

          <section className="card qb-section"><div className="qb-section-head"><h2>Pricing</h2><button type="button" className="qb-text-btn" onClick={addLine}><Plus size={14} /> Add line</button></div><div className="qb-lines"><div className="qb-line qb-line-head"><span>Description</span><span>Qty</span><span>Unit</span><span /></div>{builder.lineItems.map((item, index) => <div className="qb-line" key={index}><input aria-label={`Line ${index + 1} description`} value={item.description} onChange={(event) => updateLine(index, 'description', event.target.value)} /><input aria-label={`Line ${index + 1} quantity`} type="number" min="1" value={item.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /><div className="qb-money"><span>$</span><input aria-label={`Line ${index + 1} unit price`} type="number" min="0" step=".01" value={item.unitPrice} onChange={(event) => updateLine(index, 'unitPrice', event.target.value)} /></div><button type="button" aria-label="Remove line" onClick={() => removeLine(index)} disabled={builder.lineItems.length === 1}><Trash2 size={15} /></button></div>)}</div><div className="qb-fees"><label>Setup / art fee <span><b>$</b><input type="number" min="0" step=".01" value={builder.setupFee} onChange={(event) => update('setupFee', event.target.value)} /></span></label><label>Shipping <span><b>$</b><input type="number" min="0" step=".01" value={builder.shipping} onChange={(event) => update('shipping', event.target.value)} /></span></label><label>Discount <span><b>$</b><input type="number" min="0" step=".01" value={builder.discount} onChange={(event) => update('discount', event.target.value)} /></span></label><label>Tax rate <span><input type="number" min="0" max="100" step=".01" value={builder.taxRate} onChange={(event) => update('taxRate', event.target.value)} /><b>%</b></span></label></div></section>

          <section className="card qb-section"><div className="qb-section-head"><h2>Design concepts</h2><label className="qb-upload"><FileImage size={14} /> Add concepts<input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => { addConcepts(event.target.files); event.target.value = ''; }} /></label></div><p className="qb-help">The customer’s studio proof is included automatically. Add revised concepts or production variations to show in the quote document.</p>{[...builder.concepts.map((concept, index) => ({ ...concept, kind: 'saved', index })), ...conceptFiles.map((concept, index) => ({ ...concept, kind: 'new', index }))].map((concept) => <div className="qb-concept-edit" key={`${concept.kind}-${concept.index}`}><img src={concept.imageUrl || concept.preview} alt="" /><div><input value={concept.label} onChange={(event) => concept.kind === 'saved' ? update('concepts', builder.concepts.map((item, i) => i === concept.index ? { ...item, label: event.target.value } : item)) : setConceptFiles((current) => current.map((item, i) => i === concept.index ? { ...item, label: event.target.value } : item))} /><textarea rows="2" placeholder="Concept notes" value={concept.notes || ''} onChange={(event) => concept.kind === 'saved' ? update('concepts', builder.concepts.map((item, i) => i === concept.index ? { ...item, notes: event.target.value } : item)) : setConceptFiles((current) => current.map((item, i) => i === concept.index ? { ...item, notes: event.target.value } : item))} /></div><button type="button" aria-label="Remove concept" onClick={() => concept.kind === 'saved' ? update('concepts', builder.concepts.filter((_, i) => i !== concept.index)) : setConceptFiles((current) => current.filter((_, i) => i !== concept.index))}><Trash2 size={15} /></button></div>)}</section>

          <section className="card qb-section"><h2>Terms & message</h2><div className="qb-grid"><label>Quote number<input value={builder.quoteNumber} onChange={(event) => update('quoteNumber', event.target.value)} /></label><label>Valid until<input type="date" value={builder.validUntil} onChange={(event) => update('validUntil', event.target.value)} /></label></div><label>Lead time<input value={builder.leadTime} onChange={(event) => update('leadTime', event.target.value)} /></label><label>Payment terms<textarea rows="2" value={builder.paymentTerms} onChange={(event) => update('paymentTerms', event.target.value)} /></label><label>Customer message<textarea rows="4" value={builder.customerMessage} onChange={(event) => update('customerMessage', event.target.value)} /></label><label>Internal notes <small>Not shown in the document</small><textarea rows="3" value={builder.internalNotes} onChange={(event) => update('internalNotes', event.target.value)} /></label></section>
        </div>

        <aside className="qb-preview-wrap">
          <div className="qb-preview-actions"><span>Live quote document{!emailReady ? ' · Set up SMTP to email directly' : pendingEdits ? ' · Save changes before emailing' : quote.adminQuote?.lastSentAt ? ` · Sent ${new Date(quote.adminQuote.lastSentAt).toLocaleDateString()}` : ' · Ready to email'}</span><button type="button" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</button><a href={`mailto:${quote.email}?subject=${encodeURIComponent(`${builder.quoteNumber} · Truekin custom quote`)}`}><Mail size={14} /> Reply manually</a></div>
          <article className="qb-document" id="truekin-quote-document">
            <header className="qb-doc-head"><div className="qb-doc-brand"><ShieldMark size={45} /><Wordmark height={21} /></div><div><span>Custom quote</span><strong>{builder.quoteNumber}</strong><small>Prepared {new Date().toLocaleDateString()}</small></div></header>
            <div className="qb-doc-rule" />
            <section className="qb-doc-for"><div><small>Prepared for</small><strong>{quote.name}</strong><span>{quote.organization || quote.email}</span></div><div><small>Valid until</small><strong>{builder.validUntil ? new Date(`${builder.validUntil}T12:00:00`).toLocaleDateString() : 'Upon confirmation'}</strong><span>{quote.neededBy ? `Requested by ${quote.neededBy}` : 'Schedule confirmed after approval'}</span></div></section>
            {customerConcepts.length > 0 && <section className="qb-doc-section"><h3>Design concepts</h3><div className="qb-doc-concepts">{customerConcepts.map((concept, index) => <figure key={`${concept.imageUrl}-${index}`}><img src={concept.imageUrl} alt={concept.label} /><figcaption><strong>{concept.label}</strong>{concept.notes && <span>{concept.notes}</span>}</figcaption></figure>)}</div></section>}
            <section className="qb-doc-section"><h3>Project pricing</h3><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>{builder.lineItems.map((item, index) => <tr key={index}><td>{item.description || 'Custom production'}</td><td>{Number(item.quantity) || 0}</td><td>{money(item.unitPrice)}</td><td>{money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</td></tr>)}</tbody></table><div className="qb-doc-totals"><span>Items + setup <strong>{money(totals.subtotal)}</strong></span>{Number(builder.shipping) > 0 && <span>Shipping <strong>{money(builder.shipping)}</strong></span>}{Number(builder.discount) > 0 && <span>Discount <strong>−{money(builder.discount)}</strong></span>}{totals.tax > 0 && <span>Tax <strong>{money(totals.tax)}</strong></span>}<span className="is-total">Quote total <strong>{money(totals.total)}</strong></span></div></section>
            <section className="qb-doc-terms"><div><small>Lead time</small><strong>{builder.leadTime}</strong></div><div><small>Payment terms</small><strong>{builder.paymentTerms}</strong></div></section>
            {builder.customerMessage && <p className="qb-doc-message">{builder.customerMessage}</p>}
            <footer><span>{BRAND_SLOGAN}</span><span>Truekin · reply to the emailed proposal</span></footer>
          </article>
        </aside>
      </div>
      <style>{`
        .qb-actions{display:flex;gap:8px}.qb-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;font-family:var(--font-secondary);font-size:11px;letter-spacing:.1em;text-transform:uppercase}.qb-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(460px,.9fr);gap:22px;align-items:start}.qb-controls{display:grid;gap:16px}.qb-section{padding:22px}.qb-section h2{font-family:var(--font-display);font-size:21px;font-weight:400;letter-spacing:.04em;text-transform:uppercase}.qb-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.qb-brief-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.qb-brief-grid span{display:grid;gap:3px}.qb-brief-grid small,.qb-doc-for small,.qb-doc-terms small{font-family:var(--font-secondary);font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--text-muted)}.qb-brief-grid strong,.qb-brief-grid a{font-size:13px}.qb-details{margin-top:18px;padding:14px;background:#f1ece2;font-size:13px;line-height:1.6;white-space:pre-wrap}.qb-estimate{margin-top:12px;padding:12px 14px;border-left:3px solid #446343;background:#eef2e9;display:grid;grid-template-columns:1fr auto;gap:4px 10px}.qb-estimate span,.qb-estimate small{font-size:11px;color:var(--text-secondary)}.qb-estimate strong{font-size:15px}.qb-estimate small{grid-column:1/-1}.qb-lines{display:grid;gap:8px}.qb-line{display:grid;grid-template-columns:minmax(170px,1fr) 72px 104px 32px;gap:7px}.qb-line input,.qb-fees input,.qb-section>label input,.qb-section>label textarea,.qb-grid input,.qb-concept-edit input,.qb-concept-edit textarea{width:100%;border:1px solid var(--border);background:#fff;padding:9px 10px;font:inherit}.qb-line-head{font-family:var(--font-secondary);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)}.qb-line>button,.qb-concept-edit>button{border:0;background:transparent;color:var(--text-muted)}.qb-money{display:flex;align-items:center;border:1px solid var(--border);background:#fff}.qb-money span{padding-left:8px;color:var(--text-muted)}.qb-money input{border:0;padding-left:3px}.qb-text-btn,.qb-upload{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;font-size:11px;font-weight:700;cursor:pointer}.qb-fees{display:grid;grid-template-columns:1fr 1fr;gap:9px 14px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}.qb-fees label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--text-secondary)}.qb-fees label>span{display:flex;align-items:center;width:112px}.qb-fees b{font-weight:400;color:var(--text-muted)}.qb-fees input{text-align:right;padding:7px}.qb-help{font-size:12px;color:var(--text-secondary);line-height:1.5;margin:-5px 0 14px}.qb-concept-edit{display:grid;grid-template-columns:74px 1fr 30px;gap:10px;margin-top:10px;align-items:start}.qb-concept-edit img{width:74px;height:74px;object-fit:contain;background:#f1ece2;border:1px solid var(--border)}.qb-concept-edit>div{display:grid;gap:6px}.qb-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.qb-section>label,.qb-grid label{display:grid;gap:5px;margin-top:12px;font-size:11px;font-weight:700}.qb-section label small{font-weight:400;color:var(--text-muted)}.qb-preview-wrap{position:sticky;top:20px}.qb-preview-actions{display:flex;align-items:center;gap:9px;margin-bottom:9px}.qb-preview-actions>span{margin-right:auto;font-family:var(--font-secondary);font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted)}.qb-preview-actions button,.qb-preview-actions a{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);background:#fff;padding:7px 9px;font-size:10px;font-weight:700}.qb-document{background:#fff;padding:34px 36px;box-shadow:0 12px 35px #302d2517;border:1px solid #ddd7ca;color:#171713}.qb-doc-head{display:flex;justify-content:space-between;align-items:flex-start}.qb-doc-brand{display:flex;align-items:center;gap:10px}.qb-doc-head>div:last-child{display:grid;text-align:right;gap:3px}.qb-doc-head>div:last-child span,.qb-doc-head>div:last-child small{font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:#7a776d}.qb-doc-head>div:last-child strong{font-family:var(--font-display);font-size:22px;font-weight:400}.qb-doc-rule{height:3px;background:#171713;margin:22px 0}.qb-doc-for{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-bottom:22px}.qb-doc-for>div{display:grid;gap:4px}.qb-doc-for strong{font-size:14px}.qb-doc-for span{font-size:11px;color:#6e6a61}.qb-doc-section{padding:18px 0;border-top:1px solid #ddd7ca}.qb-doc-section h3{font-family:var(--font-secondary);font-size:10px;letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px}.qb-doc-concepts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.qb-doc-concepts figure{margin:0;border:1px solid #ddd7ca}.qb-doc-concepts img{width:100%;aspect-ratio:1.18;object-fit:contain;background:#f2eee6}.qb-doc-concepts figcaption{display:grid;gap:2px;padding:8px}.qb-doc-concepts figcaption strong{font-size:10px}.qb-doc-concepts figcaption span{font-size:9px;color:#6e6a61}.qb-doc-section table{width:100%;border-collapse:collapse;font-size:10px}.qb-doc-section th{text-align:left;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#777269;padding:6px 5px;border-bottom:1px solid #171713}.qb-doc-section td{padding:8px 5px;border-bottom:1px solid #ebe6dc}.qb-doc-section th:not(:first-child),.qb-doc-section td:not(:first-child){text-align:right}.qb-doc-totals{margin:12px 0 0 auto;width:58%;display:grid}.qb-doc-totals span{display:flex;justify-content:space-between;padding:4px;font-size:10px}.qb-doc-totals .is-total{margin-top:5px;padding-top:8px;border-top:2px solid #171713;font-size:13px}.qb-doc-terms{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:16px;background:#f1ece2}.qb-doc-terms>div{display:grid;gap:5px}.qb-doc-terms strong{font-size:10px;line-height:1.5}.qb-doc-message{margin:16px 0;font-size:10px;line-height:1.6}.qb-document footer{display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #ddd7ca;font-family:var(--font-secondary);font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#777269}@media(max-width:1180px){.qb-layout{grid-template-columns:1fr}.qb-preview-wrap{position:static;max-width:720px}}@media(max-width:650px){.qb-line{grid-template-columns:1fr 64px 94px 30px}.qb-fees,.qb-grid{grid-template-columns:1fr}.qb-document{padding:24px 20px}.qb-doc-concepts{grid-template-columns:1fr}.qb-preview-actions{flex-wrap:wrap}.qb-preview-actions>span{width:100%}}
        @media print{body *{visibility:hidden!important}#truekin-quote-document,#truekin-quote-document *{visibility:visible!important}#truekin-quote-document{position:absolute;left:0;top:0;width:100%;border:0;box-shadow:none;padding:.45in}@page{margin:.3in}}
      `}</style>
    </AdminLayout>
  );
}

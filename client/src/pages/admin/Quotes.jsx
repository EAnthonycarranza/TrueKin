import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calculator, ClipboardList, FileText, Palette, Sticker, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', closed: 'Closed' };
const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

function ProductIcon({ type }) {
  if (type === 'sticker') return <Sticker size={18} />;
  if (type === 'tshirt') return <Shirt size={18} />;
  return <FileText size={18} />;
}

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.adminGetQuotes()
      .then((data) => setQuotes(data.quotes || []))
      .catch((error) => toast.error(error.message || 'Could not load quote requests'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => quotes.filter((quote) => filter === 'all' || quote.status === filter), [quotes, filter]);
  const counts = useMemo(() => quotes.reduce((result, quote) => ({ ...result, [quote.status]: (result[quote.status] || 0) + 1 }), {}), [quotes]);

  return (
    <AdminLayout
      title="Custom Quotes"
      description="Turn customer briefs and studio designs into production-ready proposals."
      action={<Link to="/quote" className="btn btn-secondary btn-sm" target="_blank">View customer flow <ArrowRight size={14} /></Link>}
    >
      <div className="aq-summary">
        <div><ClipboardList size={18} /><span>All requests</span><strong>{quotes.length}</strong></div>
        <div><Palette size={18} /><span>Studio designs</span><strong>{quotes.filter((quote) => quote.requestType === 'studio').length}</strong></div>
        <div><Calculator size={18} /><span>Ready to build</span><strong>{counts.new || 0}</strong></div>
      </div>

      <div className="aq-filters" role="group" aria-label="Filter quotes">
        {['all', 'new', 'contacted', 'quoted', 'closed'].map((status) => <button type="button" key={status} className={filter === status ? 'is-active' : ''} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'all' ? 'All' : STATUS_LABELS[status]}{status !== 'all' && <span>{counts[status] || 0}</span>}</button>)}
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div> : visible.length === 0 ? (
        <div className="card aq-empty"><ClipboardList size={32} /><strong>No quote requests here</strong><span>New requests will appear as soon as a customer sends one.</span></div>
      ) : (
        <div className="card aq-table-wrap">
          <table className="aq-table">
            <thead><tr><th>Request</th><th>Customer</th><th>Project</th><th>Admin quote</th><th>Status</th><th /></tr></thead>
            <tbody>{visible.map((quote) => {
              const prepared = Boolean(quote.adminQuote?.lineItems?.length);
              const total = quote.adminQuote?.total || 0;
              return <tr key={quote._id}>
                <td data-label="Request"><span className="aq-type-icon"><ProductIcon type={quote.productType} /></span><div><strong>{quote.requestType === 'studio' ? 'Studio design' : 'Quick request'}</strong><small>{new Date(quote.createdAt).toLocaleDateString()}</small></div></td>
                <td data-label="Customer"><strong>{quote.name}</strong><small>{quote.organization || quote.email}</small></td>
                <td data-label="Project"><strong>{quote.productType === 'tshirt' ? 'T-shirt' : quote.productType === 'sticker' ? 'Sticker' : 'Custom project'} · {quote.quantity.toLocaleString()}</strong><small>{quote.neededBy ? `Needed ${quote.neededBy}` : 'No deadline supplied'}</small></td>
                <td data-label="Admin quote"><strong>{prepared ? money(total) : 'Build quote'}</strong><small>{prepared ? 'Admin-prepared proposal' : 'Not prepared'}</small></td>
                <td data-label="Status"><span className={`aq-status is-${quote.status}`}>{STATUS_LABELS[quote.status] || quote.status}</span></td>
                <td><Link to={`/admin/quotes/${quote._id}`} className="aq-open" aria-label={`Open quote for ${quote.name}`}>Open <ArrowRight size={14} /></Link></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      <style>{`
        .aq-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:20px}.aq-summary>div{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:18px 20px;background:var(--surface);border:1px solid var(--border);border-radius:8px}.aq-summary svg{color:var(--accent)}.aq-summary span{font-family:var(--font-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--text-secondary)}.aq-summary strong{font-size:22px}.aq-filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}.aq-filters button{border:1px solid var(--border);background:var(--surface);padding:9px 13px;border-radius:999px;font-size:12px;font-weight:700}.aq-filters button.is-active{background:var(--ink);color:#fff;border-color:var(--ink)}.aq-filters button span{margin-left:7px;opacity:.65}.aq-table-wrap{padding:0;overflow:hidden}.aq-table{width:100%;border-collapse:collapse}.aq-table th{padding:13px 18px;text-align:left;font-family:var(--font-secondary);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--text-muted);background:#eee9df}.aq-table td{padding:16px 18px;border-top:1px solid var(--border);vertical-align:middle}.aq-table td:first-child{display:flex;gap:11px;align-items:center}.aq-table td strong,.aq-table td small{display:block}.aq-table td strong{font-size:13px}.aq-table td small{margin-top:4px;font-size:11px;color:var(--text-muted)}.aq-type-icon{width:36px;height:36px;display:grid;place-items:center;color:#fff;background:var(--ink);border-radius:6px}.aq-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-family:var(--font-secondary);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:#ebe6db}.aq-status.is-new{color:#9b2c1d;background:#f7e4df}.aq-status.is-quoted{color:#246342;background:#dff0e5}.aq-open{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;white-space:nowrap}.aq-empty{min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;color:var(--text-muted)}.aq-empty strong{color:var(--ink)}@media(max-width:900px){.aq-summary{grid-template-columns:1fr}.aq-table thead{display:none}.aq-table,.aq-table tbody,.aq-table tr,.aq-table td{display:block}.aq-table tr{padding:14px 18px;border-top:1px solid var(--border)}.aq-table td{padding:6px 0;border:0;display:flex!important;justify-content:space-between;gap:14px}.aq-table td:before{content:attr(data-label);font-family:var(--font-secondary);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)}.aq-table td:first-child{justify-content:flex-start}.aq-table td:first-child:before,.aq-table td:last-child:before{display:none}.aq-table td:last-child{padding-top:12px}}
      `}</style>
    </AdminLayout>
  );
}

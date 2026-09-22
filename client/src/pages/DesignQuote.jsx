import { lazy, Suspense, useCallback, useEffect, useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Clock3, FileCheck2, Info, Sticker, Shirt, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import RecaptchaNotice from '../components/RecaptchaNotice';
import { BRAND_SLOGAN } from '../content/brand';
import { executeRecaptcha, RECAPTCHA_ACTIONS } from '../utils/recaptcha';

const UnifiedStudio = lazy(() => import('../components/studio/UnifiedStudio'));
const EMPTY_CUSTOMER = { name: '', email: '', phone: '', organization: '', neededBy: '', details: '' };

export default function DesignQuote() {
  const [productType, setProductType] = useState('tshirt');
  const [stickerEnabled, setStickerEnabled] = useState(true);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [specs, setSpecs] = useState({ quantity: 24, printLocations: 1, stickerSize: '3in', rush: false });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [printHelpOpen, setPrintHelpOpen] = useState(false);
  const printHelpId = useId();
  const [attached, setAttached] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const studioProducts = stickerEnabled ? ['tshirt', 'sticker'] : ['tshirt'];
  const productSummary = `${productType === 'sticker' ? 'Sticker' : 'T-shirt'} · ${Number(specs.quantity || 0).toLocaleString()} pieces · ${productType === 'sticker' ? `${specs.stickerSize.replace('in', ' inch')} finished size` : `${specs.printLocations} print ${Number(specs.printLocations) === 1 ? 'location' : 'locations'}`}${specs.rush ? ' · Rush timing requested' : ''}`;

  useEffect(() => {
    api.getStudioSettings()
      .then((data) => setStickerEnabled(data.studioTools?.stickerEnabled !== false))
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    attached?.sidePreviews.forEach((side) => URL.revokeObjectURL(side.preview));
  }, [attached]);

  const changeProduct = (nextType) => {
    if (nextType === productType) return true;
    if (attached && !window.confirm('Switch products? The design attached to this quote will be cleared, but your device draft stays available.')) return false;
    setAttached(null);
    setProductType(nextType);
    return true;
  };

  const attachDesign = async (blob, design, capturedSides) => {
    const sidePreviews = (capturedSides || [{ side: 'front', label: 'Front', blob }])
      .map((side) => ({ ...side, preview: URL.createObjectURL(side.blob) }));
    setAttached({ blob, design, sidePreviews });
    toast.success(`${sidePreviews.length} ${sidePreviews.length === 1 ? 'view' : 'views'} attached to your quote`);
    return { persisted: false, message: 'Design attached to this quote. Your editable device draft stays safe until you submit.' };
  };

  const clearAttachedDesign = useCallback(() => {
    setAttached(null);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const quantity = Number(specs.quantity);
    if (!customer.name.trim() || !customer.email.trim() || !customer.details.trim()) return toast.error('Name, email, and project notes are required.');
    if (!Number.isInteger(quantity) || quantity < 1) return toast.error('Enter a valid quantity.');
    if (!attached) return toast.error('Attach your studio design before sending the quote.');
    if (attached.design.productType !== productType) return toast.error('The attached design does not match the selected product.');
    setSending(true);
    try {
      const recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.quote);
      const formData = new FormData();
      Object.entries(customer).forEach(([key, value]) => formData.append(key, value));
      formData.append('requestType', 'studio');
      formData.append('productType', productType);
      formData.append('quantity', String(quantity));
      formData.append('specifications', JSON.stringify({ printLocations: Number(specs.printLocations), stickerSize: specs.stickerSize, rush: specs.rush }));
      formData.append('designData', JSON.stringify(attached.design));
      formData.append('designPreview', attached.blob, `truekin-${productType}-concept.png`);
      const otherSides = attached.sidePreviews.filter((side) => side.side !== 'front');
      formData.append('designSideIds', JSON.stringify(otherSides.map((side) => side.side)));
      otherSides.forEach((side) => formData.append('designSidePreviews', side.blob, `truekin-${productType}-${side.side}.png`));
      formData.append('recaptchaToken', recaptchaToken);
      const result = await api.submitStudioQuote(formData);
      setSentEmail(customer.email);
      setConfirmationEmailSent(result.confirmationEmailSent === true);
      setSent(true);
      toast.success(result.message || 'Your studio quote is with Truekin.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error(error.message || 'Could not submit your studio quote.');
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <main className="dq-page"><section className="dq-success"><span><Check size={30} /></span><p className="dq-kicker">Studio submission received</p><h1>Your idea is in<br />Truekin’s hands.</h1><p>We sent the production brief to the admin workspace and will reply to <strong>{sentEmail}</strong> within one business day with confirmed pricing, artwork notes, and timing.</p><p>{confirmationEmailSent ? 'A confirmation email has also been sent to you.' : 'Your brief is saved, but we could not send an automatic confirmation email right now.'}</p><div><Link to="/shop" className="btn btn-primary">Browse the shop</Link><button type="button" className="btn btn-secondary" onClick={() => setSent(false)}>Start another design</button></div></section></main>
  );

  return (
    <main className="dq-page">
      <section className="dq-hero"><div className="container"><Link to="/quote" className="dq-back"><ArrowLeft size={14} /> All quote options</Link><p className="dq-kicker">Truekin self-design quote</p><h1>Build the proof.<br /><span>Get a personal quote.</span></h1><p className="dq-hero-copy">Upload your own artwork, place it on a T-shirt or sticker, and send a production-ready concept. An admin reviews the details, builds your quote, and emails it to you. A finished design helps us respond faster.</p><div className="dq-benefits"><span><Sparkles size={16} /> Editable 2D + 3D studio</span><span><Clock3 size={16} /> Faster review brief</span></div></div></section>

      <form onSubmit={submit} className="container dq-form">
        <section className={`dq-spec card ${detailsOpen ? '' : 'is-collapsed'}`}>
          <header><span>01</span><div><h2>Product details</h2><p>Choose the blank and tell us what you have in mind.</p></div><button type="button" className="dq-spec-toggle" aria-expanded={detailsOpen} aria-controls="dq-product-details" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? <><ChevronUp size={15} /> Hide details</> : <><ChevronDown size={15} /> Edit details</>}</button></header>
          <p className="dq-spec-summary">{productSummary}</p>
          <div id="dq-product-details" hidden={!detailsOpen}>
          <div className="dq-product-grid">
            <button type="button" className={productType === 'tshirt' ? 'is-active' : ''} onClick={() => changeProduct('tshirt')}><Shirt size={25} /><span><strong>T-shirt</strong><small>Front, back, and sleeves</small></span>{productType === 'tshirt' && <Check size={17} />}</button>
            {stickerEnabled && <button type="button" className={productType === 'sticker' ? 'is-active' : ''} onClick={() => changeProduct('sticker')}><Sticker size={25} /><span><strong>Sticker</strong><small>Full-color durable face</small></span>{productType === 'sticker' && <Check size={17} />}</button>}
          </div>
          <div className="dq-fields">
            <label>Quantity<input type="number" min="1" max="100000" value={specs.quantity} onChange={(event) => setSpecs((current) => ({ ...current, quantity: event.target.value }))} /></label>
            {productType === 'tshirt' ? <div className="dq-field"><div className="dq-label-row"><label htmlFor="dq-print-locations">Print locations</label><div className={`dq-help ${printHelpOpen ? 'is-open' : ''}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPrintHelpOpen(false); }}><button type="button" aria-label="What is a print location?" aria-expanded={printHelpOpen} aria-controls={printHelpId} onClick={() => setPrintHelpOpen((open) => !open)}><Info size={16} aria-hidden="true" /></button><div id={printHelpId} className="dq-help-popover" role="tooltip"><strong>What is a print location?</strong><p>One area of a T-shirt where artwork is applied—for example, the front, back, or a sleeve. Front and back are two locations. Choose how many areas you plan to print; Truekin will confirm the details and pricing in your emailed quote.</p></div></div></div><select id="dq-print-locations" value={specs.printLocations} onChange={(event) => setSpecs((current) => ({ ...current, printLocations: Number(event.target.value) }))}><option value="1">1 location</option><option value="2">2 locations</option><option value="3">3 locations</option><option value="4">4 locations</option></select></div> : <label>Finished size<select value={specs.stickerSize} onChange={(event) => setSpecs((current) => ({ ...current, stickerSize: event.target.value }))}><option value="2in">2 inch</option><option value="3in">3 inch</option><option value="4in">4 inch</option></select></label>}
          </div>
          <label className="dq-rush"><input type="checkbox" checked={specs.rush} onChange={(event) => setSpecs((current) => ({ ...current, rush: event.target.checked }))} /><span><strong>Ask us to review rush timing</strong><small>Truekin will confirm availability and pricing in the emailed quote.</small></span></label>
          </div>
        </section>

        <section className="dq-studio-section"><header className="dq-section-title"><span>02</span><div><h2>Make the concept</h2><p>Import artwork, add text, and inspect a synced 3D model. When it looks right, attach it to the quote. Reattach after further edits.</p></div>{attached && <span className="dq-attached"><FileCheck2 size={14} /> Attached</span>}</header><Suspense fallback={<div className="dq-studio-loading"><div className="spinner" /> Loading design studio…</div>}><UnifiedStudio productType={productType} onProductTypeChange={changeProduct} onDesignChange={clearAttachedDesign} availableProductTypes={studioProducts} compactTools captureAllSides draftKey="customer-quote" onSave={attachDesign} saveLabel="Attach to quote" /></Suspense></section>

        <section className="dq-contact card"><header><span>03</span><div><h2>Send your production brief</h2><p>An admin will review it and email your custom quote.</p></div></header><div className="dq-fields"><label>Name <em>*</em><input required maxLength="120" value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" /></label><label>Email <em>*</em><input type="email" required maxLength="200" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" /></label><label>Phone<input maxLength="40" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="Optional" /></label><label>Organization<input maxLength="160" value={customer.organization} onChange={(event) => setCustomer((current) => ({ ...current, organization: event.target.value }))} placeholder="Church, team, company…" /></label><label>Needed by<input maxLength="80" value={customer.neededBy} onChange={(event) => setCustomer((current) => ({ ...current, neededBy: event.target.value }))} placeholder="Date or event" /></label></div><label>Project notes <em>*</em><textarea required rows="5" maxLength="4000" value={customer.details} onChange={(event) => setCustomer((current) => ({ ...current, details: event.target.value }))} placeholder="Tell us about materials, sizes, finish, audience, budget, or anything the design does not show." /></label>{attached && <div className="dq-proof"><div className="dq-proof-sides">{attached.sidePreviews.map((side) => <figure key={side.side}><img src={side.preview} alt={`${side.label} studio mockup`} /><figcaption>{side.label}</figcaption></figure>)}</div><div><strong>Studio views attached</strong><span>{productType === 'sticker' ? 'Sticker' : 'T-shirt'} · {Number(specs.quantity || 0).toLocaleString()} pieces · {attached.sidePreviews.length} {attached.sidePreviews.length === 1 ? 'view' : 'views'}</span></div></div>}<button type="submit" className="btn btn-primary btn-lg dq-submit" disabled={sending}>{sending ? 'Verifying & sending…' : 'Send Studio Quote'} <ArrowRight size={16} /></button><p className="dq-fine">This sends your editable studio design, all product-side previews, project details, and contact information to Truekin. No pricing is shown until an admin sends your quote. {BRAND_SLOGAN}</p><RecaptchaNotice /></section>
      </form>
      <section className="dq-quick"><div><p className="dq-kicker">Prefer a conversation first?</p><h2>Use the quick quote instead.</h2><p>Describe the idea in a few lines and Truekin will follow up by email. No design work required.</p></div><Link to="/quote#quote-form" className="btn btn-secondary">Open quick request <ArrowRight size={15} /></Link></section>
      <style>{`
        .dq-proof{display:grid!important;gap:12px}.dq-proof-sides{display:flex!important;flex-wrap:wrap;gap:8px}.dq-proof-sides figure{margin:0;min-width:74px;text-align:center}.dq-proof-sides img{display:block;width:74px;height:74px;object-fit:contain;background:#fff}.dq-proof-sides figcaption{margin-top:3px;font-size:10px;color:var(--text-secondary)}
        .dq-page{background:#f4f1ea;padding-bottom:70px}.dq-hero{padding:72px 0 64px;background:#0a0a0a;color:#f4f1ea;background-image:radial-gradient(700px 400px at 78% 10%,#44634344,transparent 70%)}.dq-back{display:inline-flex;align-items:center;gap:6px;color:#d8d2c6;font:700 10px var(--font-secondary);letter-spacing:.13em;text-transform:uppercase;margin-bottom:42px}.dq-kicker{font:700 10px var(--font-secondary);letter-spacing:.2em;text-transform:uppercase;color:#d25b49}.dq-hero h1,.dq-success h1{font-family:var(--font-display);font-size:clamp(56px,8vw,94px);font-weight:400;line-height:.9;text-transform:uppercase;margin:14px 0 22px}.dq-hero h1 span{color:#d34a37}.dq-hero-copy{max-width:680px;color:#c9c4b9;font-size:17px;line-height:1.65}.dq-benefits{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.dq-benefits span{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #3a3934;font:600 10px var(--font-secondary);letter-spacing:.1em;text-transform:uppercase}.dq-form{display:grid;gap:24px;margin-top:34px}.dq-spec,.dq-contact{padding:28px}.dq-spec>header,.dq-contact>header,.dq-section-title{display:flex;gap:14px;align-items:flex-start;margin-bottom:22px}.dq-spec>header>span,.dq-contact>header>span,.dq-section-title>span:first-child{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border-strong);font:700 10px var(--font-secondary)}.dq-spec h2,.dq-contact h2,.dq-section-title h2,.dq-quick h2{font-family:var(--font-display);font-size:27px;font-weight:400;letter-spacing:.03em;text-transform:uppercase}.dq-spec header p,.dq-contact header p,.dq-section-title p{color:var(--text-secondary);font-size:13px;margin-top:4px}.dq-product-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dq-product-grid button{display:flex;align-items:center;gap:12px;text-align:left;padding:16px;border:1.5px solid var(--border);background:#fff}.dq-product-grid button.is-active{border-color:#446343;background:#eef2e9;box-shadow:inset 0 0 0 1px #446343}.dq-product-grid button>span{display:grid;gap:3px;flex:1}.dq-product-grid strong{font-size:14px}.dq-product-grid small{font-size:11px;color:var(--text-secondary)}.dq-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.dq-spec label,.dq-contact label{display:grid;gap:7px;font:700 11px var(--font-secondary);letter-spacing:.05em;text-transform:uppercase}.dq-spec input,.dq-spec select,.dq-contact input,.dq-contact textarea{width:100%;padding:12px;border:1px solid var(--border-strong);background:#fff;font:400 14px var(--font-body);letter-spacing:0;text-transform:none}.dq-contact em{color:var(--accent);font-style:normal}.dq-rush{display:flex!important;grid-template-columns:auto 1fr;align-items:start;gap:10px!important;margin-top:16px;padding:13px;background:#f1ece2}.dq-rush input{width:auto;margin-top:3px}.dq-rush span{display:grid;gap:4px}.dq-rush small{font:400 11px var(--font-body);letter-spacing:0;text-transform:none;color:var(--text-secondary)}.dq-estimate{display:grid;grid-template-columns:1fr auto;gap:8px 14px;margin-top:18px;padding:20px;background:#171713;color:#fff}.dq-estimate>div{display:grid;gap:4px}.dq-estimate span{font:700 9px var(--font-secondary);letter-spacing:.16em;text-transform:uppercase;color:#aaa69c}.dq-estimate strong{font-size:25px}.dq-estimate small{font-size:11px;color:#c7c2b7}.dq-estimate p{grid-column:1/-1;color:#aaa69c;font-size:10px;line-height:1.5}.dq-studio-section{min-width:0}.dq-section-title{padding:22px 24px;margin:0;background:#ebe6db;border:1px solid #d8d2c6;border-bottom:0}.dq-section-title>div{flex:1}.dq-attached{display:inline-flex!important;width:auto!important;height:auto!important;gap:5px;padding:7px 9px;border:0!important;background:#dcebdc;color:#275d3a;font-size:10px!important}.dq-studio-loading{min-height:360px;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;border:1px solid var(--border)}.dq-contact>label{margin-top:16px}.dq-proof{display:flex;align-items:center;gap:12px;margin-top:16px;padding:10px;border:1px solid #b8cbb8;background:#eff5ed}.dq-proof img{width:74px;height:74px;object-fit:contain;background:#fff}.dq-proof div{display:grid;gap:4px}.dq-proof span{font-size:12px;color:var(--text-secondary)}.dq-submit{width:100%;justify-content:center;margin-top:20px}.dq-fine{font-size:10px;color:var(--text-muted);text-align:center;margin:10px auto;max-width:620px;line-height:1.5}.dq-quick{max-width:1180px;margin:34px auto 0;padding:28px 32px;background:#ded8cb;display:flex;align-items:center;justify-content:space-between;gap:22px}.dq-quick>div>p:last-child{color:var(--text-secondary);font-size:13px;margin-top:6px}.dq-success{max-width:760px;margin:70px auto;padding:65px;text-align:center;background:#fff;border:1px solid var(--border)}.dq-success>span{width:62px;height:62px;display:grid;place-items:center;margin:0 auto 20px;background:#446343;color:#fff;border-radius:50%}.dq-success h1{font-size:66px}.dq-success>p:not(.dq-kicker){color:var(--text-secondary);font-size:16px;line-height:1.65}.dq-success>div{display:flex;justify-content:center;gap:10px;margin-top:24px}@media(min-width:980px){.dq-form{grid-template-columns:350px minmax(0,1fr)}.dq-spec{grid-column:1;grid-row:1}.dq-studio-section{grid-column:2;grid-row:1}.dq-contact{grid-column:1/-1;grid-row:2}}@media(max-width:760px){.dq-hero{padding:48px 0}.dq-hero h1{font-size:58px}.dq-product-grid,.dq-fields{grid-template-columns:1fr}.dq-spec,.dq-contact{padding:20px}.dq-section-title{padding:18px}.dq-quick{margin:26px 16px 0;display:grid}.dq-success{margin:24px 16px;padding:38px 20px}.dq-success h1{font-size:48px}.dq-success>div{display:grid}.dq-attached{display:none!important}}
        .dq-spec>header{align-items:center;margin-bottom:8px}.dq-spec>header>div{flex:1}.dq-spec.is-collapsed{padding:16px 22px}.dq-spec-summary{margin:8px 0 0 48px;color:var(--text-secondary);font-size:12px}.dq-spec-toggle{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border:1px solid var(--border-strong);background:#fff;padding:8px 10px;font:700 10px var(--font-secondary);letter-spacing:.05em;text-transform:uppercase;cursor:pointer}.dq-spec-toggle:hover{background:#eef2e9}.dq-product-grid{margin-top:20px}.dq-field{display:grid;gap:7px;position:relative}.dq-label-row{display:flex;align-items:center;gap:6px}.dq-help{position:relative;display:inline-flex}.dq-help>button{display:grid;place-items:center;width:26px;height:26px;border:1px solid #c7cec2;border-radius:50%;background:#eef2e9;color:#365638;cursor:help}.dq-help-popover{display:none;position:absolute;z-index:30;top:calc(100% + 8px);left:-90px;width:min(295px,calc(100vw - 46px));padding:14px;background:#171b16;color:#fff;box-shadow:0 8px 28px #0003;text-transform:none;letter-spacing:normal;font:12px/1.55 var(--font-body)}.dq-help-popover strong{display:block;margin-bottom:5px;font-size:12px}.dq-help-popover p{margin:0;color:#e1e6dc}.dq-help.is-open .dq-help-popover{display:block}@media(hover:hover){.dq-help:hover .dq-help-popover,.dq-help:focus-within .dq-help-popover{display:block}}@media(min-width:980px){.dq-form{grid-template-columns:minmax(0,1fr)}.dq-spec,.dq-studio-section,.dq-contact{grid-column:1;grid-row:auto}}@media(max-width:760px){.dq-spec.is-collapsed{padding:15px}.dq-spec>header{gap:10px}.dq-spec>header h2{font-size:22px}.dq-spec>header p{display:none}.dq-spec-summary{margin-left:0;line-height:1.5}.dq-spec-toggle{padding:8px;font-size:9px}.dq-help-popover{left:-135px}}
        @media(max-width:760px){.dq-help-popover{left:-110px;width:min(280px,calc(100vw - 40px))}}
      `}</style>
    </main>
  );
}

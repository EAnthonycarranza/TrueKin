import { useEffect, useState } from 'react';
import { Box, Check, Image as ImageIcon, Rotate3D } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import UnifiedPreview from '../components/studio/UnifiedPreview';
import { BRAND_SLOGAN } from '../content/brand';

export default function QuoteDesignSample() {
  const { token } = useParams();
  const [sample, setSample] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getQuoteDesignPreview(token)
      .then((result) => { if (active) setSample(result.sample); })
      .catch((requestError) => { if (active) setError(requestError.message || 'This design sample is unavailable.'); });
    return () => { active = false; };
  }, [token]);

  if (error) return (
    <main className="qds-page"><section className="qds-state card"><Box size={34} /><h1>Design sample unavailable</h1><p>{error}</p><Link to="/" className="btn btn-secondary">Return home</Link></section><SampleStyles /></main>
  );
  if (!sample) return <main className="qds-page"><section className="qds-state card"><div className="spinner" /><p>Preparing your design sample…</p></section><SampleStyles /></main>;

  const productName = sample.productType === 'sticker' ? 'sticker' : 'T-shirt';
  return (
    <main className="qds-page">
      <section className="qds-hero">
        <div className="container qds-hero-inner">
          <div><p className="qds-kicker"><Check size={14} /> Customer design sample</p><h1>Your submitted<br /><span>{productName} design.</span></h1></div>
          <div className="qds-intro"><Rotate3D size={24} /><p>Rotate the 3D sample, zoom in, and switch sides to review the artwork included with your Truekin quote.</p>{sample.quoteNumber && <strong>{sample.quoteNumber}</strong>}</div>
        </div>
      </section>

      <section className="container qds-content">
        <div className="qds-viewer">
          <div className="qds-section-title"><Box size={17} /><div><h2>Interactive 3D view</h2><p>Use the side buttons, then drag or swipe the sample to inspect it.</p></div></div>
          <UnifiedPreview designData={sample.design} initialMode="3d" customerView height={620} />
        </div>
        <aside className="qds-sides card">
          <div className="qds-section-title"><ImageIcon size={17} /><div><h2>Submitted design</h2><p>These are the exact product-side mockups sent to Truekin.</p></div></div>
          <div className="qds-side-grid">{sample.sidePreviews.map((side) => <figure key={side.side}><img src={side.imageUrl} alt={`${side.label} submitted ${productName} design`} /><figcaption>{side.label}</figcaption></figure>)}</div>
          <p className="qds-note">This is a visual sample for reviewing artwork placement. Truekin will confirm final production details by email.</p>
        </aside>
      </section>
      <section className="qds-footer"><strong>{BRAND_SLOGAN}</strong><span>Truekin custom apparel</span></section>
      <SampleStyles />
    </main>
  );
}

function SampleStyles() {
  return <style>{`
    .qds-page{min-height:75vh;background:#f4f1ea}.qds-hero{padding:62px 0 54px;background:#0c0c0b;color:#f4f1ea}.qds-hero-inner{display:grid;grid-template-columns:1.2fr .8fr;gap:50px;align-items:end}.qds-kicker{display:flex;align-items:center;gap:7px;font:700 10px var(--font-secondary);letter-spacing:.16em;text-transform:uppercase;color:#d25b49}.qds-hero h1{font-family:var(--font-display);font-size:clamp(54px,7vw,88px);font-weight:400;line-height:.9;text-transform:uppercase;margin:16px 0 0}.qds-hero h1 span{color:#d34a37}.qds-intro{display:grid;gap:12px;padding:22px;border:1px solid #3c3a35;color:#d1ccc0}.qds-intro p{font-size:14px;line-height:1.65}.qds-intro strong{font:700 10px var(--font-secondary);letter-spacing:.13em;text-transform:uppercase;color:#fff}.qds-content{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(290px,.75fr);gap:22px;padding-top:34px;padding-bottom:38px;align-items:start}.qds-viewer,.qds-sides{min-width:0}.qds-sides{padding:20px}.qds-section-title{display:flex;gap:10px;align-items:flex-start;margin-bottom:14px}.qds-section-title h2{font-family:var(--font-display);font-size:23px;font-weight:400;letter-spacing:.04em;text-transform:uppercase}.qds-section-title p{margin-top:3px;color:var(--text-secondary);font-size:12px;line-height:1.5}.qds-side-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.qds-side-grid figure{margin:0;border:1px solid var(--border);background:#f8f6f0}.qds-side-grid img{display:block;width:100%;aspect-ratio:1;object-fit:contain}.qds-side-grid figcaption{padding:7px;text-align:center;font:700 9px var(--font-secondary);letter-spacing:.08em;text-transform:uppercase}.qds-note{margin-top:15px;padding:12px;background:#eee9dd;color:var(--text-secondary);font-size:11px;line-height:1.55}.qds-footer{display:flex;justify-content:space-between;gap:15px;padding:20px max(20px,calc((100vw - 1180px)/2));background:#e4ded1;font:700 9px var(--font-secondary);letter-spacing:.13em;text-transform:uppercase}.qds-state{display:grid;justify-items:center;gap:14px;max-width:620px;margin:60px auto;padding:55px 24px;text-align:center}.qds-state h1{font-family:var(--font-display);font-size:42px;font-weight:400;text-transform:uppercase}.qds-state p{color:var(--text-secondary)}@media(max-width:850px){.qds-hero{padding:45px 0}.qds-hero-inner,.qds-content{grid-template-columns:1fr}.qds-intro{max-width:600px}.qds-content{padding-top:22px}.qds-viewer>div:last-of-type{min-height:520px}}@media(max-width:560px){.qds-hero h1{font-size:50px}.qds-content{padding-left:14px;padding-right:14px}.qds-side-grid{grid-template-columns:1fr 1fr}.qds-footer{display:grid}.qds-viewer>div:last-of-type{min-height:440px}}
  `}</style>;
}

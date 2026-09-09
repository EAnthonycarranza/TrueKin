import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Send, MessageSquare, Scissors, Palette, Package, MapPin,
  Clock, ShieldCheck, Users, Sparkles, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

const EMPTY_QUOTE = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  quantity: '',
  neededBy: '',
  details: '',
};

const PROCESS_STEPS = [
  {
    icon: MessageSquare,
    title: 'Tell us the story',
    desc:
      'Share your idea, team, event, or church. The clearer the vision, the sharper the quote.',
  },
  {
    icon: Palette,
    title: 'We mock it up',
    desc:
      'You get art proofs, blank options, and a written quote — free, no strings.',
  },
  {
    icon: Scissors,
    title: 'Approved · pressed',
    desc:
      'Once you sign off, every shirt is heat-pressed by hand in small batches.',
  },
  {
    icon: Package,
    title: 'Packed + handed over',
    desc:
      'Sorted by size, folded, bagged. Free local pickup — in your hands in 7–14 days.',
  },
];

const FAQS = [
  {
    q: "What's the minimum order?",
    a: '12 shirts. No maximum — we\'ve pressed runs of 500+ for churches and events.',
  },
  {
    q: 'Do I need finished artwork?',
    a: 'No. Send a rough sketch, a reference photo, or even just a verse. We\'ll refine it with you before anything hits the press.',
  },
  {
    q: 'Which blanks do you use?',
    a: 'Bella + Canvas, Gildan, and Comfort Colors are the standards. We\'ll recommend based on budget and feel.',
  },
  {
    q: 'How fast is turnaround?',
    a: 'Most orders are ready to collect within 7–14 days of art approval. Rush timelines available — just tell us when you need them.',
  },
  {
    q: 'Can I mix sizes?',
    a: 'Yes. Unisex cut, sizes XS–3XL. Mix freely across the order.',
  },
  {
    q: 'How does pricing work?',
    a: 'Quantity, print colors, and blank choice drive the price. Bigger runs mean lower per-shirt cost. Every quote is written, so there are no surprises.',
  },
];

export default function Quote() {
  const [quote, setQuote] = useState(EMPTY_QUOTE);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleChange = (field) => (e) =>
    setQuote((q) => ({ ...q, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quote.name || !quote.email || !quote.quantity || !quote.details) {
      toast.error('Name, email, quantity, and project details are required.');
      return;
    }
    const qty = parseInt(quote.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error('Quantity must be at least 1.');
      return;
    }
    setSending(true);
    try {
      const res = await api.submitQuote({
        ...quote,
        quantity: qty,
      });
      setSentEmail(quote.email);
      setSent(true);
      setQuote(EMPTY_QUOTE);
      toast.success(res?.message || "Quote request sent — we'll be in touch.");
      // Scroll form back into view for the success card
      window.scrollTo({ top: document.getElementById('quote-form')?.offsetTop - 100 || 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.message || 'Could not send your request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page tk-quote-page">
      {/* ============  HERO  ============ */}
      <section className="tk-quote-hero">
        <div className="container">
          <span className="tk-quote-eyebrow">Request a Custom Quote</span>
          <h1 className="tk-quote-h1">
            Your story,<br />
            <span className="tk-quote-accent">pressed by hand.</span>
          </h1>
          <p className="tk-quote-sub">
            From 12 shirts to five hundred, we handle the whole run — art,
            blanks, press, and handoff — with the same care whether you're a
            small group, a church, a team, or a business.
          </p>
          <div className="tk-quote-hero-actions">
            <a href="#quote-form" className="btn btn-primary btn-lg">
              Start a Quote
              <ArrowRight size={16} />
            </a>
            <Link to="/shop" className="btn btn-secondary btn-lg">
              Browse the Kin
            </Link>
          </div>

          <div className="tk-quote-stats">
            <div className="tk-quote-stat">
              <strong>12</strong>
              <span>Shirt minimum</span>
            </div>
            <span className="tk-quote-stat-div" />
            <div className="tk-quote-stat">
              <strong>7–14</strong>
              <span>Days after approval</span>
            </div>
            <span className="tk-quote-stat-div" />
            <div className="tk-quote-stat">
              <strong>1</strong>
              <span>Business day to respond</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============  PROCESS  ============ */}
      <section className="tk-quote-process">
        <div className="container">
          <header className="tk-quote-section-head">
            <span className="tk-quote-eyebrow dark">How it works</span>
            <h2 className="tk-quote-h2">
              From first message to folded shirts.
            </h2>
          </header>
          <div className="tk-quote-process-grid">
            {PROCESS_STEPS.map((s, i) => (
              <div key={i} className="tk-quote-step">
                <div className="tk-quote-step-n">0{i + 1}</div>
                <div className="tk-quote-step-icon">
                  <s.icon size={22} />
                </div>
                <h4 className="tk-quote-step-title">{s.title}</h4>
                <p className="tk-quote-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============  FORM  ============ */}
      <section id="quote-form" className="tk-quote-form-section">
        <div className="container">
          <div className="tk-quote-grid">
            {/* Left — pitch */}
            <div className="tk-quote-side">
              <span className="tk-quote-eyebrow light">Tell us what you need</span>
              <h2 className="tk-quote-h2 light">
                Every run is<br />
                <span className="tk-quote-accent">custom-fit.</span>
              </h2>
              <span className="tk-quote-rule" aria-hidden />
              <p className="tk-quote-lead">
                Fill out what you know — we'll follow up on the rest. Most
                quotes go back within one business day, with a mockup and
                a written price.
              </p>
              <ul className="tk-quote-list">
                <li><Check size={14} /> Free art + mockup review</li>
                <li><Check size={14} /> Unisex fit · sizes XS–3XL</li>
                <li><Check size={14} /> Premium blanks (Bella + Canvas · Gildan · Comfort Colors)</li>
                <li><Check size={14} /> No deposit to get a quote</li>
                <li><Check size={14} /> Made-to-order · small-batch pressed</li>
              </ul>

              <div className="tk-quote-side-card">
                <Sparkles size={18} />
                <div>
                  <strong>Working on something bigger?</strong>
                  <p>
                    For runs of 200+ shirts, ask about volume pricing and
                    coordinated size matrices when you message us.
                  </p>
                </div>
              </div>
            </div>

            {/* Right — form or success */}
            <div className="tk-quote-card">
              {sent ? (
                <div className="tk-quote-success">
                  <div className="tk-quote-success-icon">
                    <Check size={28} />
                  </div>
                  <h3>Request received.</h3>
                  <p>
                    Thanks — we'll reply to{' '}
                    <strong>{sentEmail || 'your email'}</strong> within one
                    business day with a full quote, mockup notes, and a
                    timeline.
                  </p>
                  <div className="tk-quote-success-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSent(false)}
                    >
                      Send another request
                    </button>
                    <Link to="/shop" className="btn btn-primary">
                      Browse Shop
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="tk-quote-form">
                  <div className="tk-quote-form-head">
                    <MessageSquare size={16} />
                    <strong>Custom Order Details</strong>
                  </div>

                  <div className="tk-quote-row">
                    <label className="tk-quote-field">
                      <span>Name <em>*</em></span>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={quote.name}
                        onChange={handleChange('name')}
                        placeholder="Jane Doe"
                      />
                    </label>
                    <label className="tk-quote-field">
                      <span>Email <em>*</em></span>
                      <input
                        type="email"
                        required
                        maxLength={200}
                        value={quote.email}
                        onChange={handleChange('email')}
                        placeholder="you@church.org"
                      />
                    </label>
                  </div>

                  <div className="tk-quote-row">
                    <label className="tk-quote-field">
                      <span>Phone</span>
                      <input
                        type="tel"
                        maxLength={40}
                        value={quote.phone}
                        onChange={handleChange('phone')}
                        placeholder="(optional)"
                      />
                    </label>
                    <label className="tk-quote-field">
                      <span>Organization</span>
                      <input
                        type="text"
                        maxLength={160}
                        value={quote.organization}
                        onChange={handleChange('organization')}
                        placeholder="Church, team, company…"
                      />
                    </label>
                  </div>

                  <div className="tk-quote-row">
                    <label className="tk-quote-field">
                      <span>Quantity <em>*</em></span>
                      <input
                        type="number"
                        required
                        min={1}
                        max={100000}
                        value={quote.quantity}
                        onChange={handleChange('quantity')}
                        placeholder="e.g. 50"
                      />
                    </label>
                    <label className="tk-quote-field">
                      <span>Needed by</span>
                      <input
                        type="text"
                        maxLength={80}
                        value={quote.neededBy}
                        onChange={handleChange('neededBy')}
                        placeholder="e.g. June 14"
                      />
                    </label>
                  </div>

                  <label className="tk-quote-field">
                    <span>Project details <em>*</em></span>
                    <textarea
                      required
                      rows={6}
                      maxLength={4000}
                      value={quote.details}
                      onChange={handleChange('details')}
                      placeholder="Tell us about the design, colors, sizes, blank preference, budget — anything that helps us quote it right. Attachments can follow by email."
                    />
                  </label>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg tk-quote-submit"
                    disabled={sending}
                  >
                    <Send size={16} />
                    {sending ? 'Sending…' : 'Request Quote'}
                  </button>
                  <p className="tk-quote-note">
                    By submitting, you agree to be contacted by Truekin about
                    this order. Unisex fit only · heat-pressed by hand.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============  FAQ  ============ */}
      <section className="tk-quote-faq">
        <div className="container">
          <header className="tk-quote-section-head">
            <span className="tk-quote-eyebrow dark">Common questions</span>
            <h2 className="tk-quote-h2">Before you send it over.</h2>
          </header>
          <div className="tk-quote-faq-grid">
            {FAQS.map((f, i) => (
              <div key={i} className="tk-quote-faq-item">
                <h4>{f.q}</h4>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============  TRUST STRIP  ============ */}
      <section className="tk-quote-trust">
        <div className="container tk-quote-trust-inner">
          <div className="tk-quote-trust-item">
            <Clock size={18} />
            <span>Replies within 1 business day</span>
          </div>
          <div className="tk-quote-trust-item">
            <ShieldCheck size={18} />
            <span>No deposit for a quote</span>
          </div>
          <div className="tk-quote-trust-item">
            <Users size={18} />
            <span>Trusted by churches, teams, and small businesses</span>
          </div>
          <div className="tk-quote-trust-item">
            <MapPin size={18} />
            <span>Free local pickup</span>
          </div>
        </div>
      </section>

      <style>{`
        .tk-quote-page {
          background: var(--bg, #f4f1ea);
          padding-bottom: 0;
        }

        /* ---------- HERO ---------- */
        .tk-quote-hero {
          position: relative;
          padding: 90px 0 70px;
          background: var(--ink, #0a0a0a);
          color: #f4f1ea;
          border-bottom: 1px solid #1f1f1f;
          background-image:
            radial-gradient(900px 500px at 15% 10%, rgba(200,48,31,0.12), transparent 65%),
            radial-gradient(700px 400px at 85% 100%, rgba(244,241,234,0.04), transparent 60%);
          overflow: hidden;
        }
        .tk-quote-eyebrow {
          display: block;
          font-family: var(--font-secondary, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.65);
          margin-bottom: 14px;
        }
        .tk-quote-eyebrow.dark { color: var(--brand, #c8301f); }
        .tk-quote-eyebrow.light { color: rgba(244,241,234,0.65); }
        .tk-quote-h1 {
          font-family: var(--font-display, inherit);
          font-size: clamp(44px, 6vw, 84px);
          font-weight: 400;
          line-height: 0.96;
          letter-spacing: 0.01em;
          margin-bottom: 22px;
          max-width: 820px;
        }
        .tk-quote-accent { color: var(--brand, #c8301f); }
        .tk-quote-sub {
          max-width: 620px;
          color: rgba(244,241,234,0.74);
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 30px;
        }
        .tk-quote-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 44px;
        }
        .tk-quote-hero-actions .btn-secondary {
          background: transparent;
          color: #f4f1ea;
          border: 1.5px solid rgba(244,241,234,0.5);
        }
        .tk-quote-hero-actions .btn-secondary:hover {
          background: rgba(244,241,234,0.08);
          border-color: rgba(244,241,234,0.8);
        }
        .tk-quote-stats {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
          padding-top: 28px;
          border-top: 1px solid rgba(244,241,234,0.12);
        }
        .tk-quote-stat strong {
          display: block;
          font-family: var(--font-display, inherit);
          font-size: 34px;
          letter-spacing: 0.02em;
          color: #fff;
        }
        .tk-quote-stat span {
          font-family: var(--font-secondary, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.55);
        }
        .tk-quote-stat-div {
          width: 1px;
          height: 46px;
          background: rgba(244,241,234,0.15);
        }
        @media (max-width: 520px) {
          .tk-quote-stat-div { display: none; }
        }

        /* ---------- SECTION HEAD ---------- */
        .tk-quote-section-head {
          margin-bottom: 40px;
          max-width: 680px;
        }
        .tk-quote-h2 {
          font-family: var(--font-display, inherit);
          font-size: clamp(32px, 4.2vw, 54px);
          font-weight: 400;
          line-height: 1;
          letter-spacing: 0.01em;
        }
        .tk-quote-h2.light { color: #f4f1ea; }

        /* ---------- PROCESS ---------- */
        .tk-quote-process {
          padding: 80px 0;
          background: var(--bg, #f4f1ea);
          border-bottom: 1px solid var(--border, #e5e5e0);
        }
        .tk-quote-process-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
        }
        @media (max-width: 900px) {
          .tk-quote-process-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .tk-quote-process-grid { grid-template-columns: 1fr; }
        }
        .tk-quote-step {
          position: relative;
          padding: 26px 22px 22px;
          background: #fff;
          border: 1.5px solid var(--border, #e5e5e0);
          border-radius: 10px;
          transition: transform 0.2s var(--ease, ease), border-color 0.2s;
        }
        .tk-quote-step:hover {
          transform: translateY(-2px);
          border-color: var(--border-strong, #c7c7bf);
        }
        .tk-quote-step-n {
          position: absolute;
          top: 14px;
          right: 18px;
          font-family: var(--font-secondary, inherit);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--brand, #c8301f);
        }
        .tk-quote-step-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: var(--ink, #0a0a0a);
          color: #f4f1ea;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .tk-quote-step-title {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .tk-quote-step-desc {
          font-size: 13.5px;
          color: var(--text-secondary, #555);
          line-height: 1.6;
        }

        /* ---------- FORM SECTION ---------- */
        .tk-quote-form-section {
          padding: 90px 0;
          background: var(--ink, #0a0a0a);
          color: #f4f1ea;
          position: relative;
          background-image:
            radial-gradient(900px 500px at 10% 10%, rgba(200,48,31,0.10), transparent 60%),
            radial-gradient(900px 500px at 90% 100%, rgba(244,241,234,0.04), transparent 60%);
        }
        .tk-quote-grid {
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 56px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .tk-quote-grid { grid-template-columns: 1fr; gap: 36px; }
        }
        .tk-quote-rule {
          display: block;
          width: 56px;
          height: 3px;
          background: var(--brand, #c8301f);
          margin: 18px 0;
          border-radius: 2px;
        }
        .tk-quote-lead {
          color: rgba(244,241,234,0.72);
          font-size: 15.5px;
          line-height: 1.7;
          max-width: 480px;
        }
        .tk-quote-list {
          margin-top: 22px;
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tk-quote-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(244,241,234,0.82);
          font-size: 14px;
          letter-spacing: 0.01em;
        }
        .tk-quote-list li svg {
          color: var(--brand, #c8301f);
          flex-shrink: 0;
        }
        .tk-quote-side-card {
          margin-top: 28px;
          display: flex;
          gap: 14px;
          padding: 18px 20px;
          background: rgba(244,241,234,0.05);
          border: 1px solid rgba(244,241,234,0.12);
          border-radius: 10px;
        }
        .tk-quote-side-card svg {
          color: var(--brand, #c8301f);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .tk-quote-side-card strong {
          display: block;
          font-family: var(--font-secondary, inherit);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #f4f1ea;
          margin-bottom: 6px;
        }
        .tk-quote-side-card p {
          color: rgba(244,241,234,0.68);
          font-size: 13.5px;
          line-height: 1.55;
        }

        /* ---------- FORM CARD ---------- */
        .tk-quote-card {
          background: #fafaf5;
          color: var(--ink, #0a0a0a);
          border-radius: 12px;
          padding: 28px 28px 24px;
          border: 1.5px solid #1f1f1f;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        }
        .tk-quote-form-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-secondary, inherit);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink, #0a0a0a);
          padding-bottom: 14px;
          margin-bottom: 18px;
          border-bottom: 1px solid var(--border, #e5e5e0);
        }
        .tk-quote-form-head svg { color: var(--brand, #c8301f); }
        .tk-quote-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .tk-quote-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 520px) {
          .tk-quote-row { grid-template-columns: 1fr; }
        }
        .tk-quote-field {
          display: flex;
          flex-direction: column;
        }
        .tk-quote-field span {
          font-family: var(--font-secondary, inherit);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink, #0a0a0a);
          margin-bottom: 6px;
        }
        .tk-quote-field span em {
          color: var(--brand, #c8301f);
          font-style: normal;
          margin-left: 2px;
        }
        .tk-quote-field input,
        .tk-quote-field textarea {
          font-family: inherit;
          font-size: 14px;
          padding: 10px 12px;
          background: #fff;
          border: 1.5px solid var(--border-strong, #c7c7bf);
          border-radius: 4px;
          color: var(--ink, #0a0a0a);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .tk-quote-field textarea {
          resize: vertical;
          min-height: 140px;
          line-height: 1.5;
        }
        .tk-quote-field input:focus,
        .tk-quote-field textarea:focus {
          border-color: var(--ink, #0a0a0a);
          box-shadow: 0 0 0 3px rgba(10,10,10,0.08);
        }
        .tk-quote-submit {
          margin-top: 6px;
          justify-content: center;
          width: 100%;
          gap: 8px;
        }
        .tk-quote-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .tk-quote-note {
          font-size: 11.5px;
          color: var(--text-muted, #777);
          text-align: center;
          margin-top: 10px;
          letter-spacing: 0.03em;
        }

        /* ---------- SUCCESS ---------- */
        .tk-quote-success {
          text-align: center;
          padding: 34px 10px 10px;
        }
        .tk-quote-success-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--brand, #c8301f);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }
        .tk-quote-success h3 {
          font-family: var(--font-display, inherit);
          font-size: 28px;
          font-weight: 400;
          letter-spacing: 0.02em;
          margin-bottom: 12px;
        }
        .tk-quote-success p {
          color: var(--text-secondary, #555);
          font-size: 14.5px;
          line-height: 1.6;
          margin-bottom: 22px;
          max-width: 380px;
          margin-left: auto;
          margin-right: auto;
        }
        .tk-quote-success-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ---------- FAQ ---------- */
        .tk-quote-faq {
          padding: 80px 0;
          background: var(--bg, #f4f1ea);
          border-bottom: 1px solid var(--border, #e5e5e0);
        }
        .tk-quote-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 22px;
        }
        @media (max-width: 720px) {
          .tk-quote-faq-grid { grid-template-columns: 1fr; }
        }
        .tk-quote-faq-item {
          padding: 22px 24px;
          background: #fff;
          border: 1.5px solid var(--border, #e5e5e0);
          border-left: 3px solid var(--brand, #c8301f);
          border-radius: 8px;
        }
        .tk-quote-faq-item h4 {
          font-family: var(--font-secondary, inherit);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink, #0a0a0a);
          margin-bottom: 8px;
        }
        .tk-quote-faq-item p {
          color: var(--text-secondary, #555);
          font-size: 14px;
          line-height: 1.6;
        }

        /* ---------- TRUST STRIP ---------- */
        .tk-quote-trust {
          padding: 28px 0;
          background: var(--ink, #0a0a0a);
          color: #f4f1ea;
        }
        .tk-quote-trust-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
        }
        .tk-quote-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-secondary, inherit);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.82);
        }
        .tk-quote-trust-item svg { color: var(--brand, #c8301f); }
      `}</style>
    </div>
  );
}

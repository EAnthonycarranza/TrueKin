import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Truck, Shield, RefreshCw, Sparkles, Star, Check,
  Cross, Heart, Users, Flame, Scissors, Package,
  Palette, Send, Building2, CalendarDays, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ShieldMark, KnotMark, Wordmark } from '../components/brand/Logo';

const EMPTY_QUOTE = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  quantity: '',
  neededBy: '',
  details: '',
};

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const [quote, setQuote] = useState(EMPTY_QUOTE);
  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  useEffect(() => {
    api.getProducts('featured=true')
      .then((d) => setFeatured(d.products || []))
      .catch(() => {});
  }, []);

  const handleQuoteChange = (field) => (e) =>
    setQuote((q) => ({ ...q, [field]: e.target.value }));

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!quote.name || !quote.email || !quote.quantity || !quote.details) {
      toast.error('Name, email, quantity, and project details are required.');
      return;
    }
    setQuoteSending(true);
    try {
      const res = await api.submitQuote({
        ...quote,
        quantity: parseInt(quote.quantity, 10) || 0,
      });
      toast.success(res.message || 'Quote request received.');
      setSentEmail(quote.email);
      setQuote(EMPTY_QUOTE);
      setQuoteSent(true);
    } catch (err) {
      toast.error(err.message || 'Could not send your request.');
    } finally {
      setQuoteSending(false);
    }
  };

  return (
    <div className="home">
      {/* ================  HERO  ================ */}
      <section className="home-hero grunge">
        <div className="home-hero-bg" aria-hidden />
        <div className="home-hero-scan" aria-hidden />
        <div className="container home-hero-inner">
          <div className="home-hero-content">
            <span className="home-hero-tag stamp">
              <Flame size={12} /> Your design · Heat-pressed by hand · Unisex fit
            </span>
            <h1 className="home-hero-title display">
              <span className="home-hero-line">Your design,</span>
              <span className="home-hero-line home-hero-line-emph">
                <span className="home-hero-accent">our press.</span>
              </span>
            </h1>
            <span className="rule rule-brand" aria-hidden />
            <p className="home-hero-desc">
              Truekin is a heat-press shop built around <strong>your</strong>
              {' '}artwork. Send us your logo, your team graphic, your church
              crest — we'll cut it, press it by hand, and ship it on a premium
              unisex tee. We also release a small line of our own designs, but
              the main thing we do is press yours.
            </p>
            <div className="home-hero-cta">
              <a href="#quote" className="btn btn-primary btn-xl">
                Get a Custom Quote <ArrowRight size={18} />
              </a>
              <Link to="/shop" className="btn btn-secondary btn-xl">
                Shop Ready-Made
              </Link>
            </div>
            <div className="home-hero-proof">
              <div className="home-hero-avatars" aria-hidden>
                <span style={{ background: 'linear-gradient(135deg,#3a3a3a,#111)' }} />
                <span style={{ background: 'linear-gradient(135deg,#8b3a2a,#c8301f)' }} />
                <span style={{ background: 'linear-gradient(135deg,#5a564c,#232323)' }} />
                <span style={{ background: 'linear-gradient(135deg,#d9d3c2,#8a8578)' }} />
              </div>
              <div>
                <div className="home-stars">
                  {[0,1,2,3,4].map((i) => (
                    <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                  ))}
                  <span className="home-rating">4.9</span>
                </div>
                <p className="home-proof-text">
                  Trusted by churches, teams, and organizations nationwide.
                </p>
              </div>
            </div>
          </div>

          <div className="home-hero-visual" aria-hidden>
            <div className="home-hero-crest">
              <KnotMark size={340} />
            </div>
            <div className="home-hero-card home-hero-card-1">
              <div className="home-hero-card-tag">Bestseller</div>
              <div className="home-hero-mock" style={{ background: 'linear-gradient(145deg, #0a0a0a, #232323)' }}>
                <ShieldMark size={78} style={{ color: '#f4f1ea' }} />
              </div>
              <div className="home-hero-card-info">
                <strong>Kingdom Heavyweight</strong>
                <span>$34</span>
              </div>
            </div>
            <div className="home-hero-card home-hero-card-2">
              <div className="home-hero-card-tag">New Drop</div>
              <div className="home-hero-mock" style={{ background: 'linear-gradient(145deg, #f4f1ea, #d9d3c2)', color: '#0a0a0a' }}>
                <KnotMark size={78} />
              </div>
              <div className="home-hero-card-info">
                <strong>Bone Cross Tee</strong>
                <span>$32</span>
              </div>
            </div>
            <div className="home-hero-card home-hero-card-3">
              <div className="home-hero-card-tag">Limited</div>
              <div className="home-hero-mock" style={{ background: 'linear-gradient(145deg, #c8301f, #8b3a2a)' }}>
                <Cross size={78} color="#f4f1ea" strokeWidth={1.5} />
              </div>
              <div className="home-hero-card-info">
                <strong>Ember Crest</strong>
                <span>$36</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================  CUSTOM MADE MARQUEE  ================ */}
      <section className="home-marquee" aria-hidden>
        <div className="home-marquee-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <div className="home-marquee-row" key={i}>
              {[
                'Custom-Made Shirts',
                'For Your Church',
                'For Your Team',
                'For Your Event',
                'Unisex Fit Only',
                'Heat-Pressed By Hand',
                'Bring Your Design',
              ].map((t) => (
                <span key={`${i}-${t}`} className="home-marquee-item">
                  {t} <span className="home-marquee-sep">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ================  WHO WE DESIGN FOR  ================ */}
      <section className="home-section home-who">
        <div className="container">
          <div className="home-section-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <span className="section-eyebrow">Custom Orders</span>
            <h2 className="home-section-title display">Who we press for.</h2>
            <span className="rule" aria-hidden />
            <p className="home-who-lead">
              Whether it's 12 shirts for a small group or 500 for a conference,
              every order is built the same way — one design, one unisex cut,
              heat-pressed by hand.
            </p>
          </div>
          <div className="home-who-grid">
            {[
              { icon: Cross, title: 'Churches & Ministries', desc: 'Retreat tees, youth group, VBS, missions trips, volunteer staff.' },
              { icon: Users, title: 'Teams & Organizations', desc: 'Sports teams, clubs, nonprofits, student groups, crew merch.' },
              { icon: Building2, title: 'Small Businesses', desc: 'Uniforms, brand merch, staff wear, launch giveaways.' },
              { icon: CalendarDays, title: 'Events & Reunions', desc: 'Family reunions, weddings, conferences, fundraisers, memorials.' },
            ].map((c) => (
              <div key={c.title} className="home-who-card">
                <div className="home-who-icon"><c.icon size={20} /></div>
                <h4 className="display-condensed">{c.title}</h4>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================  COLLECTIONS  ================ */}
      <section className="home-section">
        <div className="container">
          <div className="home-section-head">
            <div>
              <span className="section-eyebrow">Shop by Calling</span>
              <h2 className="home-section-title display">The Collections</h2>
              <span className="rule" aria-hidden />
            </div>
            <Link to="/shop" className="home-view-all">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="home-categories">
            {[
              {
                name: 'Ink & Oath',
                sub: 'Classic black essentials',
                bg: 'linear-gradient(135deg,#0a0a0a,#1f1f1f)',
                color: '#fff',
                tag: 'Pillars',
                Icon: ShieldMark,
              },
              {
                name: 'Ember Line',
                sub: 'Cross-forward graphics',
                bg: 'linear-gradient(135deg,#c8301f,#8b3a2a)',
                color: '#fff',
                tag: 'Heat',
                Icon: KnotMark,
              },
              {
                name: 'Bone & Psalm',
                sub: 'Scripture in weathered cream',
                bg: 'linear-gradient(135deg,#f4f1ea,#d9d3c2)',
                color: '#0a0a0a',
                tag: 'Heritage',
                Icon: ShieldMark,
              },
            ].map((c) => (
              <Link to="/shop" key={c.name} className="home-cat-card">
                <div className="home-cat-visual grunge" style={{ background: c.bg, color: c.color }}>
                  <span className="home-cat-tag">{c.tag}</span>
                  <c.Icon size={140} />
                </div>
                <div className="home-cat-meta">
                  <div>
                    <h3 className="display-condensed">{c.name}</h3>
                    <p>{c.sub}</p>
                  </div>
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================  THE CRAFT (process)  ================ */}
      <section className="home-craft">
        <div className="container">
          <div className="home-craft-head">
            <div>
              <span className="section-eyebrow">The Craft</span>
              <h2 className="home-craft-title display">From your design to a finished tee.</h2>
              <span className="rule" aria-hidden />
              <p className="home-craft-lead">
                Most of what we press is <strong>your</strong> artwork — church
                logos, team graphics, event crests, family reunions, small-business
                branding. No warehouses, no middlemen. Every shirt starts as a
                premium blank and is finished, one at a time, by hand on the
                heat press.
              </p>
            </div>
          </div>
          <div className="home-craft-steps">
            {[
              {
                step: '01',
                icon: Package,
                title: 'Source the Blank',
                desc: 'We hand-pick premium blanks from Aviva Wholesale — Bella + Canvas 3001, Gildan Heavy Cotton, Comfort Colors, and Next Level. Soft hand, honest weight, colors that hold.',
              },
              {
                step: '02',
                icon: Scissors,
                title: 'Prep Your Artwork',
                desc: 'You send the design — logo, crest, verse, event graphic, anything. We prep it for press: cut on precision vinyl for clean one- and two-color work, or printed as DTF for full-color artwork that will not crack or peel.',
              },
              {
                step: '03',
                icon: Flame,
                title: 'Press With Prayer',
                desc: 'Each tee rides the heat press at the right time and temp — 325°F, firm pressure, timed by feel. No batch rushing. A prayer over every order.',
              },
              {
                step: '04',
                icon: Truck,
                title: 'Pack & Send',
                desc: 'Folded, tagged, and shipped in recycled mailers inside 3–5 days. A hand-written scripture note goes in every box.',
              },
            ].map((s) => (
              <div key={s.step} className="home-craft-step">
                <div className="home-craft-step-num stamp">{s.step}</div>
                <div className="home-craft-step-icon">
                  <s.icon size={22} />
                </div>
                <h4 className="display-condensed">{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================  QUOTE REQUEST  ================ */}
      <section id="quote" className="home-quote">
        <div className="container">
          <div className="home-quote-grid">
            <div className="home-quote-side">
              <span className="section-eyebrow" style={{ color: 'rgba(244,241,234,0.65)' }}>
                Request a Custom Quote
              </span>
              <h2 className="home-quote-title display">
                Tell us about<br />
                <span style={{ color: 'var(--brand)' }}>your shirts.</span>
              </h2>
              <span className="rule rule-brand" aria-hidden />
              <p className="home-quote-lead">
                Whether you need a dozen or five hundred, we'll price it, press
                it, and ship it. Most quotes go back within one business day.
              </p>
              <ul className="home-quote-list">
                <li><Check size={14} /> Free art + mockup review</li>
                <li><Check size={14} /> 12-shirt minimum · no maximum</li>
                <li><Check size={14} /> Unisex fit · sizes XS–3XL</li>
                <li><Check size={14} /> Premium blanks (Bella + Canvas / Gildan / Comfort Colors)</li>
                <li><Check size={14} /> Turnaround in 7–14 days after approval</li>
              </ul>
            </div>

            <div className="home-quote-card">
              {quoteSent ? (
                <div className="home-quote-success">
                  <div className="home-quote-success-icon"><Check size={26} /></div>
                  <h3 className="display-condensed">Request received.</h3>
                  <p>
                    Thanks — we'll reply to <strong>{sentEmail || 'your email'}</strong> within
                    one business day with a full quote, mockup notes, and
                    timeline.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setQuoteSent(false)}
                  >
                    Send another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleQuoteSubmit} className="home-quote-form">
                  <div className="home-quote-form-head">
                    <MessageSquare size={16} />
                    <strong>Custom Order Details</strong>
                  </div>

                  <div className="home-quote-row">
                    <label className="home-quote-field">
                      <span>Name <em>*</em></span>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={quote.name}
                        onChange={handleQuoteChange('name')}
                        placeholder="Jane Doe"
                      />
                    </label>
                    <label className="home-quote-field">
                      <span>Email <em>*</em></span>
                      <input
                        type="email"
                        required
                        maxLength={200}
                        value={quote.email}
                        onChange={handleQuoteChange('email')}
                        placeholder="you@church.org"
                      />
                    </label>
                  </div>

                  <div className="home-quote-row">
                    <label className="home-quote-field">
                      <span>Phone</span>
                      <input
                        type="tel"
                        maxLength={40}
                        value={quote.phone}
                        onChange={handleQuoteChange('phone')}
                        placeholder="(optional)"
                      />
                    </label>
                    <label className="home-quote-field">
                      <span>Organization</span>
                      <input
                        type="text"
                        maxLength={160}
                        value={quote.organization}
                        onChange={handleQuoteChange('organization')}
                        placeholder="Church, team, company…"
                      />
                    </label>
                  </div>

                  <div className="home-quote-row">
                    <label className="home-quote-field">
                      <span>Quantity <em>*</em></span>
                      <input
                        type="number"
                        required
                        min={1}
                        max={100000}
                        value={quote.quantity}
                        onChange={handleQuoteChange('quantity')}
                        placeholder="e.g. 50"
                      />
                    </label>
                    <label className="home-quote-field">
                      <span>Needed by</span>
                      <input
                        type="text"
                        maxLength={80}
                        value={quote.neededBy}
                        onChange={handleQuoteChange('neededBy')}
                        placeholder="e.g. June 14"
                      />
                    </label>
                  </div>

                  <label className="home-quote-field">
                    <span>Project details <em>*</em></span>
                    <textarea
                      required
                      rows={5}
                      maxLength={4000}
                      value={quote.details}
                      onChange={handleQuoteChange('details')}
                      placeholder="Tell us about the design, colors, sizes, blank preference, budget — anything that helps us quote it right. Attachments can follow by email."
                    />
                  </label>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg home-quote-submit"
                    disabled={quoteSending}
                  >
                    <Send size={16} />
                    {quoteSending ? 'Sending…' : 'Request Quote'}
                  </button>
                  <p className="home-quote-note">
                    By submitting, you agree to be contacted by Truekin about
                    this order. Unisex fit only · heat-pressed by hand.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================  FEATURES  ================ */}
      <section className="home-features">
        <div className="container">
          <div className="home-features-grid">
            {[
              { icon: Flame, title: 'Heat-Pressed By Hand', desc: 'Every tee pressed one at a time — no factory runs, no corners cut.' },
              { icon: Heart, title: 'Premium Blanks', desc: 'Bella + Canvas, Gildan, Comfort Colors — sourced for feel and longevity.' },
              { icon: Truck, title: 'Fast Shipping', desc: 'Free on orders $50+. Printed, packed, and sent inside 3–5 days.' },
              { icon: RefreshCw, title: 'Honest Returns', desc: '30 days, no pressure. Your peace matters more than the sale.' },
            ].map((f, i) => (
              <div key={i} className="home-feature">
                <div className="home-feature-icon">
                  <f.icon size={20} />
                </div>
                <div>
                  <h4 className="display-condensed">{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================  FEATURED PRODUCTS  ================ */}
      {featured.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="home-section-head">
              <div>
                <span className="section-eyebrow">The Kin · Featured</span>
                <h2 className="home-section-title display">This Week's Drop</h2>
                <span className="rule" aria-hidden />
              </div>
              <Link to="/shop" className="home-view-all">
                View all <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-4 stagger">
              {featured.slice(0, 8).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================  SCRIPTURE / PROMO  ================ */}
      <section className="home-promo">
        <div className="container">
          <div className="home-promo-card grunge">
            <div className="home-promo-content">
              <span className="seal" style={{ color: 'var(--brand)' }}>
                <Cross size={12} /> Ecclesiastes 4:12
              </span>
              <h2 className="home-promo-title display">
                "A cord of three<br />
                <span style={{ color: 'var(--brand)' }}>strands</span> is not<br />
                quickly broken."
              </h2>
              <p className="home-promo-desc">
                A small side-drop of our own designs, pressed the same way we
                press yours — by hand, on premium blanks. Buy 2 tees, save 20%.
              </p>
              <Link to="/shop" className="btn btn-brand btn-lg">
                Shop the Pair <ArrowRight size={16} />
              </Link>
            </div>
            <div className="home-promo-visual" aria-hidden>
              <div className="home-promo-tee home-promo-tee-1">
                <ShieldMark size={120} style={{ color: '#f4f1ea', opacity: 0.35 }} />
              </div>
              <div className="home-promo-tee home-promo-tee-2">
                <ShieldMark size={120} style={{ color: '#fff', opacity: 0.5 }} />
              </div>
              <div className="home-promo-percent display">20<small>%</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================  TESTIMONIALS  ================ */}
      <section className="home-section">
        <div className="container">
          <div className="home-section-head" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className="section-eyebrow">Word from the Kin</span>
            <h2 className="home-section-title display">Real fits. Real faith.</h2>
            <span className="rule" aria-hidden />
          </div>
          <div className="grid grid-3 home-reviews-grid">
            {[
              { name: 'Micah T.', quote: 'Ordered the Kingdom Heavyweight on a Bella + Canvas 3001 — the press is clean, the graphic is crisp, and the fit is honest. Already ordered two more.', role: 'Youth pastor · Verified buyer' },
              { name: 'Sarah L.', quote: 'You can tell every shirt was pressed by an actual person. Mine came with a hand-written Psalm 23 note. That\'s not merch, that\'s ministry.', role: 'Small-group leader · Verified buyer' },
              { name: 'Daniel O.', quote: 'The Comfort Colors blank + the weathered cross graphic feels like something I\'ll be wearing five years from now. No peeling, no fading — just clean heat-press work.', role: 'Worship lead · Verified buyer' },
            ].map((t, i) => (
              <div key={i} className="card home-review">
                <div className="home-stars" style={{ marginBottom: 14 }}>
                  {[0,1,2,3,4].map((s) => <Star key={s} size={14} fill="currentColor" strokeWidth={0} />)}
                </div>
                <p className="home-review-quote">"{t.quote}"</p>
                <div className="home-review-author">
                  <div className="home-review-avatar">{t.name[0]}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================  NEWSLETTER  ================ */}
      <section className="home-newsletter grunge">
        <div className="container">
          <div className="home-newsletter-inner">
            <div>
              <span className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>Join the Kin</span>
              <h2 className="home-newsletter-title display">
                Walk with us.
                <br />
                <span style={{ color: 'var(--brand)' }}>First dibs on every drop.</span>
              </h2>
              <p className="home-newsletter-desc">
                Get 10% off your first order, early access to new designs, and
                the occasional note of encouragement. No noise — we promise.
              </p>
            </div>
            <form
              className="home-newsletter-form"
              onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}
            >
              {subscribed ? (
                <div className="home-newsletter-success">
                  <Check size={18} /> You're on the list. Peace be with you.
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="home-newsletter-input"
                  />
                  <button className="btn btn-brand btn-lg" type="submit">
                    Join
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* =====================  STYLES  ===================== */}
      <style>{`
        .home { overflow-x: hidden; }

        /* ---------------- HERO ---------------- */
        .home-hero {
          position: relative;
          padding: 72px 0 140px;
          background: var(--bg);
          overflow: hidden;
        }
        .home-hero-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(900px 500px at 85% 10%, rgba(200,48,31,0.10), transparent 60%),
            radial-gradient(1000px 600px at 5% 100%, rgba(10,10,10,0.08), transparent 60%);
        }
        .home-hero-scan {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: repeating-linear-gradient(
            0deg,
            rgba(10,10,10,0.018) 0,
            rgba(10,10,10,0.018) 1px,
            transparent 1px,
            transparent 4px
          );
          opacity: 0.6;
        }
        .home-hero-inner {
          position: relative;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 60px;
          align-items: center;
          z-index: 2;
        }
        .home-hero-content { max-width: 640px; }
        .home-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          background: transparent;
          border: 1.5px solid var(--ink);
          color: var(--ink);
          border-radius: 2px;
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .home-hero-title {
          font-size: clamp(64px, 9vw, 132px);
          font-weight: 400;
          line-height: 0.88;
          letter-spacing: 0.01em;
          margin-bottom: 8px;
        }
        .home-hero-line { display: block; }
        .home-hero-accent {
          background: linear-gradient(100deg, var(--ink) 0%, var(--brand) 85%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .home-hero-desc {
          font-size: 16.5px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin: 24px 0 32px;
          max-width: 520px;
        }
        .home-hero-cta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 44px;
        }
        .home-hero-proof { display: flex; align-items: center; gap: 16px; }
        .home-hero-avatars {
          display: flex;
          align-items: center;
        }
        .home-hero-avatars span {
          display: block;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 2px solid var(--bg);
          margin-left: -10px;
        }
        .home-hero-avatars span:first-child { margin-left: 0; }
        .home-stars {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          color: #c8301f;
        }
        .home-rating { font-weight: 700; color: var(--text); font-size: 13px; margin-left: 6px; font-family: var(--font-secondary); letter-spacing: 0.04em; }
        .home-proof-text { font-size: 13px; color: var(--text-secondary); }

        .home-hero-visual {
          position: relative;
          height: 500px;
        }
        .home-hero-crest {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          opacity: 0.06;
          pointer-events: none;
        }
        .home-hero-card {
          position: absolute;
          width: 220px;
          background: var(--surface);
          border-radius: 6px;
          padding: 14px;
          box-shadow: var(--shadow-lg);
          border: 1.5px solid var(--ink);
          animation: floaty 6s var(--ease) infinite;
        }
        .home-hero-card-1 { top: 0; left: 6%; animation-delay: 0s; transform: rotate(-5deg); }
        .home-hero-card-2 { top: 22%; right: 0; animation-delay: 1.5s; transform: rotate(4deg); z-index: 2; }
        .home-hero-card-3 { bottom: 0; left: 28%; animation-delay: 3s; transform: rotate(-3deg); }
        .home-hero-card-tag {
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brand);
          margin-bottom: 10px;
        }
        .home-hero-mock {
          aspect-ratio: 1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          position: relative;
          overflow: hidden;
        }
        .home-hero-mock::after {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 5px 5px;
          mix-blend-mode: overlay;
          pointer-events: none;
        }
        .home-hero-card-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--font-secondary);
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .home-hero-card-info strong { font-weight: 600; }
        .home-hero-card-info span { color: var(--text-muted); font-weight: 600; }

        @media (max-width: 960px) {
          .home-hero { padding: 40px 0 80px; }
          .home-hero-inner { grid-template-columns: 1fr; gap: 40px; }
          .home-hero-visual { height: 380px; max-width: 500px; margin: 0 auto; }
          .home-hero-card { width: 180px; }
        }
        @media (max-width: 480px) {
          .home-hero-visual { height: 320px; }
          .home-hero-card { width: 160px; padding: 12px; }
        }

        /* ---------------- MARQUEE ---------------- */
        .home-marquee {
          background: var(--ink);
          color: #f4f1ea;
          padding: 22px 0;
          overflow: hidden;
          border-top: 1px solid #1f1f1f;
          border-bottom: 1px solid #1f1f1f;
        }
        .home-marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 32s linear infinite;
        }
        .home-marquee-row {
          display: flex;
          gap: 40px;
          padding-right: 40px;
          flex-shrink: 0;
        }
        .home-marquee-item {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 400;
          letter-spacing: 0.05em;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 40px;
          text-transform: uppercase;
        }
        .home-marquee-sep { color: var(--brand); }

        /* ---------------- SECTION COMMON ---------------- */
        .home-section { padding: 100px 0; }
        .home-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 44px;
          gap: 20px;
        }
        .home-section-title {
          font-size: clamp(38px, 4.5vw, 64px);
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 0.95;
          margin-top: 14px;
        }
        .home-view-all {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-secondary);
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text);
          padding: 11px 20px;
          border: 1.5px solid var(--ink);
          border-radius: 4px;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .home-view-all:hover {
          background: var(--ink);
          color: #fff;
        }

        /* ---------------- CATEGORIES ---------------- */
        .home-categories {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 768px) { .home-categories { grid-template-columns: 1fr; } }
        .home-cat-card {
          display: block;
          background: var(--surface);
          border: 1.5px solid var(--ink);
          border-radius: 6px;
          overflow: hidden;
          transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
        }
        .home-cat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }
        .home-cat-visual {
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .home-cat-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(6px);
          padding: 5px 10px;
          border-radius: 2px;
          border: 1px solid rgba(255,255,255,0.18);
          color: inherit;
        }
        .home-cat-meta {
          padding: 22px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .home-cat-meta h3 {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .home-cat-meta p {
          color: var(--text-muted);
          font-size: 13px;
          margin-top: 4px;
          font-family: var(--font-body);
          letter-spacing: 0;
          text-transform: none;
        }

        /* ---------------- THE CRAFT ---------------- */
        .home-craft {
          padding: 100px 0;
          background: var(--bg-soft);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          position: relative;
          background-image:
            radial-gradient(rgba(10,10,10,0.04) 1px, transparent 1px),
            radial-gradient(rgba(10,10,10,0.025) 1px, transparent 1px);
          background-size: 3px 3px, 7px 7px;
        }
        .home-craft-head {
          max-width: 720px;
          margin-bottom: 56px;
        }
        .home-craft-title {
          font-size: clamp(34px, 4.5vw, 60px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: 0.01em;
          margin-top: 14px;
        }
        .home-craft-lead {
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.7;
          margin-top: 20px;
          max-width: 620px;
        }
        .home-craft-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          counter-reset: craft;
        }
        @media (max-width: 900px) { .home-craft-steps { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .home-craft-steps { grid-template-columns: 1fr; } }
        .home-craft-step {
          background: var(--surface);
          border: 1.5px solid var(--ink);
          border-radius: 6px;
          padding: 24px 22px 26px;
          position: relative;
          transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease);
        }
        .home-craft-step:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }
        .home-craft-step-num {
          position: absolute;
          top: 16px;
          right: 18px;
          font-size: 13px;
          color: var(--brand);
          letter-spacing: 0.18em;
        }
        .home-craft-step-icon {
          width: 48px;
          height: 48px;
          background: var(--ink);
          color: var(--bg);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .home-craft-step h4 {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .home-craft-step p {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* ---------------- FEATURES ---------------- */
        .home-features {
          padding: 64px 0;
          background: var(--ink);
          color: #f4f1ea;
          border-top: 1px solid #1f1f1f;
          border-bottom: 1px solid #1f1f1f;
        }
        .home-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 36px;
        }
        @media (max-width: 900px) { .home-features-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; } }
        @media (max-width: 480px) { .home-features-grid { grid-template-columns: 1fr; } }
        .home-feature {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .home-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          color: var(--brand);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.14);
        }
        .home-feature h4 {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .home-feature p { font-size: 13px; color: rgba(244,241,234,0.7); line-height: 1.6; }

        /* ---------------- PROMO ---------------- */
        .home-promo { padding: 40px 0 100px; }
        .home-promo-card {
          background: linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 100%);
          color: #f4f1ea;
          border-radius: var(--radius-lg);
          padding: 72px 60px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
          position: relative;
          overflow: hidden;
          border: 1px solid #1f1f1f;
        }
        @media (max-width: 768px) {
          .home-promo-card { grid-template-columns: 1fr; padding: 48px 28px; }
        }
        .home-promo-content .seal { margin-bottom: 18px; }
        .home-promo-title {
          font-size: clamp(44px, 5.5vw, 84px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: 0.01em;
          margin-bottom: 22px;
        }
        .home-promo-desc {
          color: rgba(244,241,234,0.68);
          font-size: 16px;
          max-width: 420px;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .home-promo-visual {
          position: relative;
          height: 280px;
        }
        .home-promo-tee {
          position: absolute;
          width: 200px;
          aspect-ratio: 1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgba(255,255,255,0.12);
        }
        .home-promo-tee-1 {
          top: 8%;
          left: 10%;
          background: linear-gradient(145deg, #232323, #3a3a3a);
          transform: rotate(-8deg);
        }
        .home-promo-tee-2 {
          top: 22%;
          right: 8%;
          background: linear-gradient(145deg, var(--brand), #8b3a2a);
          transform: rotate(6deg);
        }
        .home-promo-percent {
          position: absolute;
          bottom: 4%;
          right: 28%;
          font-size: 150px;
          letter-spacing: 0.02em;
          color: rgba(255,255,255,0.07);
          line-height: 1;
        }
        .home-promo-percent small { font-size: 76px; }

        /* ---------------- REVIEWS ---------------- */
        .home-review { padding: 28px; border: 1.5px solid var(--ink); }
        .home-review-quote {
          font-size: 16px;
          line-height: 1.65;
          color: var(--text);
          margin-bottom: 22px;
        }
        .home-review-author {
          display: flex;
          align-items: center;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }
        .home-review-avatar {
          width: 42px;
          height: 42px;
          border-radius: 4px;
          background: linear-gradient(135deg, #0a0a0a, #333);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-secondary);
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .home-review-author strong { display: block; font-size: 14px; letter-spacing: -0.01em; }
        .home-review-author span { font-size: 12px; color: var(--text-muted); }

        /* ---------------- NEWSLETTER ---------------- */
        .home-newsletter {
          padding: 100px 0;
          background: var(--ink);
          color: #f4f1ea;
          position: relative;
        }
        .home-newsletter-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
          position: relative;
          z-index: 2;
        }
        @media (max-width: 800px) {
          .home-newsletter-inner { grid-template-columns: 1fr; }
        }
        .home-newsletter-title {
          font-size: clamp(40px, 5vw, 72px);
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 0.95;
          margin-top: 14px;
        }
        .home-newsletter-desc {
          color: rgba(244,241,234,0.7);
          margin-top: 16px;
          font-size: 15.5px;
          max-width: 420px;
          line-height: 1.65;
        }
        .home-newsletter-form {
          display: flex;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          padding: 6px;
          border-radius: 4px;
          border: 1.5px solid rgba(255,255,255,0.14);
        }
        .home-newsletter-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 14px 20px;
          color: #fff;
          font-size: 15px;
          outline: none;
        }
        .home-newsletter-input::placeholder { color: rgba(255,255,255,0.4); }
        .home-newsletter-success {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #a8d58c;
          font-weight: 500;
          padding: 14px 20px;
        }

        @media (max-width: 768px) {
          .home-section { padding: 64px 0; }
          .home-section-head { flex-direction: column; align-items: flex-start; }
        }

        /* ---------------- WHO WE PRESS FOR ---------------- */
        .home-who { padding-bottom: 40px; }
        .home-who-lead {
          color: var(--text-secondary);
          font-size: 15.5px;
          line-height: 1.7;
          margin-top: 18px;
          max-width: 640px;
        }
        .home-who-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 40px;
        }
        @media (max-width: 960px) { .home-who-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 520px) { .home-who-grid { grid-template-columns: 1fr; } }
        .home-who-card {
          background: var(--surface);
          border: 1.5px solid var(--ink);
          border-radius: 6px;
          padding: 22px 22px 24px;
          transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease);
        }
        .home-who-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }
        .home-who-icon {
          width: 44px;
          height: 44px;
          background: var(--brand);
          color: #fff;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .home-who-card h4 {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .home-who-card p {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        /* ---------------- QUOTE REQUEST ---------------- */
        .home-quote {
          padding: 100px 0;
          background: var(--ink);
          color: #f4f1ea;
          position: relative;
          border-top: 1px solid #1f1f1f;
          border-bottom: 1px solid #1f1f1f;
          background-image:
            radial-gradient(900px 500px at 10% 10%, rgba(200,48,31,0.10), transparent 60%),
            radial-gradient(900px 500px at 90% 100%, rgba(244,241,234,0.04), transparent 60%);
        }
        .home-quote-grid {
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 56px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .home-quote-grid { grid-template-columns: 1fr; gap: 36px; }
        }
        .home-quote-side .section-eyebrow {
          color: rgba(244,241,234,0.65) !important;
        }
        .home-quote-title {
          font-size: clamp(42px, 5.5vw, 76px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: 0.01em;
          margin-top: 14px;
          margin-bottom: 14px;
        }
        .home-quote-lead {
          color: rgba(244,241,234,0.72);
          font-size: 15.5px;
          line-height: 1.7;
          margin-top: 18px;
          max-width: 480px;
        }
        .home-quote-list {
          margin-top: 22px;
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .home-quote-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(244,241,234,0.82);
          font-size: 14px;
          letter-spacing: 0.01em;
        }
        .home-quote-list li svg {
          color: var(--brand);
          flex-shrink: 0;
        }

        .home-quote-card {
          background: #fafaf5;
          color: var(--ink);
          border-radius: 10px;
          padding: 26px 26px 22px;
          border: 1.5px solid #1f1f1f;
          box-shadow: var(--shadow-lg);
          position: relative;
        }
        .home-quote-form-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-secondary);
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink);
          padding-bottom: 14px;
          margin-bottom: 18px;
          border-bottom: 1px solid var(--border);
        }
        .home-quote-form-head svg { color: var(--brand); }
        .home-quote-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .home-quote-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 520px) { .home-quote-row { grid-template-columns: 1fr; } }
        .home-quote-field {
          display: flex;
          flex-direction: column;
        }
        .home-quote-field span {
          font-family: var(--font-secondary);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .home-quote-field span em {
          color: var(--brand);
          font-style: normal;
          margin-left: 2px;
        }
        .home-quote-field input,
        .home-quote-field textarea {
          font-family: var(--font-secondary);
          font-size: 14px;
          padding: 10px 12px;
          background: #fff;
          border: 1.5px solid var(--border-strong);
          border-radius: 4px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .home-quote-field textarea {
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          min-height: 120px;
        }
        .home-quote-field input:focus,
        .home-quote-field textarea:focus {
          border-color: var(--ink);
          box-shadow: 0 0 0 3px rgba(10,10,10,0.08);
        }
        .home-quote-submit {
          margin-top: 6px;
          justify-content: center;
          width: 100%;
          gap: 8px;
        }
        .home-quote-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .home-quote-note {
          font-size: 11.5px;
          color: var(--text-muted);
          text-align: center;
          margin-top: 10px;
          letter-spacing: 0.03em;
        }

        .home-quote-success {
          text-align: center;
          padding: 26px 10px 6px;
        }
        .home-quote-success-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--brand);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .home-quote-success h3 {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .home-quote-success p {
          color: var(--text-secondary);
          font-size: 14.5px;
          line-height: 1.6;
          margin-bottom: 20px;
          max-width: 380px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ---------------- MOBILE-FIRST POLISH ---------------- */
        @media (max-width: 640px) {
          .home-hero {
            padding: 32px 0 54px;
          }
          .home-hero-inner { gap: 28px; }
          .home-hero-tag {
            width: 100%;
            min-height: 44px;
            margin-bottom: 22px;
            padding: 8px 12px;
            justify-content: center;
            font-size: 10px;
            line-height: 1.45;
            text-align: center;
          }
          .home-hero-title {
            font-size: clamp(58px, 19vw, 74px);
            line-height: 0.89;
          }
          .home-hero-desc {
            margin: 20px 0 24px;
            font-size: 15px;
            line-height: 1.62;
          }
          .home-hero-cta {
            display: grid;
            grid-template-columns: 1fr;
            margin-bottom: 30px;
          }
          .home-hero-cta .btn { width: 100%; }
          .home-hero-proof { align-items: flex-start; gap: 12px; }
          .home-proof-text { line-height: 1.45; }
          .home-hero-visual {
            width: 100%;
            height: 260px;
            max-width: 344px;
          }
          .home-hero-card { width: 136px; padding: 10px; }
          .home-hero-card-1 { left: 0; }
          .home-hero-card-2 { right: 0; }
          .home-hero-card-3 { left: 30%; }
          .home-hero-card-tag { margin-bottom: 7px; font-size: 8px; }
          .home-hero-card-info { font-size: 9px; gap: 4px; }

          .home-marquee { padding: 14px 0; }
          .home-marquee-row { gap: 26px; padding-right: 26px; }
          .home-marquee-item { gap: 26px; font-size: 22px; }

          .home-section,
          .home-craft,
          .home-quote,
          .home-newsletter { padding: 56px 0; }
          .home-promo { padding: 24px 0 56px; }
          .home-section-head,
          .home-craft-head { margin-bottom: 28px; }
          .home-section-title,
          .home-craft-title { font-size: 40px; }
          .home-view-all { min-height: 44px; }

          .home-who { padding-bottom: 34px; }
          .home-who-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 26px;
          }
          .home-who-card { padding: 16px 14px 18px; }
          .home-who-icon {
            width: 40px;
            height: 40px;
            margin-bottom: 12px;
          }
          .home-who-card h4 { font-size: 13px; line-height: 1.2; }
          .home-who-card p { font-size: 12.5px; line-height: 1.48; }

          .home-categories,
          .home-craft-steps,
          .home-reviews-grid {
            display: flex;
            gap: 12px;
            margin-right: -16px;
            padding-right: 16px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
          }
          .home-categories::-webkit-scrollbar,
          .home-craft-steps::-webkit-scrollbar,
          .home-reviews-grid::-webkit-scrollbar { display: none; }
          .home-cat-card,
          .home-craft-step,
          .home-reviews-grid > * {
            width: min(82vw, 310px);
            flex: 0 0 auto;
            scroll-snap-align: start;
          }
          .home-cat-visual { aspect-ratio: 5 / 3; }
          .home-cat-visual > svg { width: 96px; height: 96px; }
          .home-cat-meta { padding: 17px 18px; }
          .home-cat-meta h3 { font-size: 20px; }
          .home-craft-step { padding: 20px 18px 22px; }
          .home-craft-lead { font-size: 14.5px; line-height: 1.62; }

          .home-quote-grid { gap: 28px; }
          .home-quote-title { font-size: 48px; }
          .home-quote-card { padding: 20px 16px 18px; }
          .home-quote-row { grid-template-columns: 1fr; gap: 12px; }
          .home-quote-field input,
          .home-quote-field textarea { min-height: 48px; font-size: 16px; }

          .home-features { padding: 44px 0; }
          .home-features-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px 16px;
          }
          .home-feature { display: block; }
          .home-feature-icon { margin-bottom: 10px; }
          .home-feature h4 { font-size: 12px; line-height: 1.25; }
          .home-feature p { font-size: 12px; line-height: 1.5; }

          .home-promo-card { padding: 38px 22px 24px; }
          .home-promo-title { font-size: 48px; }
          .home-promo-desc { margin-bottom: 24px; font-size: 14.5px; }
          .home-promo-visual { height: 210px; }
          .home-promo-tee { width: 146px; }
          .home-promo-percent { font-size: 100px; }
          .home-promo-percent small { font-size: 46px; }
          .home-review { padding: 22px 20px; }

          .home-newsletter-inner { gap: 28px; }
          .home-newsletter-title { font-size: 46px; }
          .home-newsletter-form { padding: 5px; }
          .home-newsletter-input { min-width: 0; padding-inline: 12px; font-size: 16px; }
        }

        @media (max-width: 400px) {
          .home-newsletter-form { flex-direction: column; }
          .home-newsletter-form .btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}

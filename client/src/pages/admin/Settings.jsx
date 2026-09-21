import { createElement, useEffect, useState } from 'react';
import { Box, Save, SlidersHorizontal, Sticker } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';

function ToolToggle({ icon, title, description, checked, onChange, accent }) {
  return (
    <label className={`tk-settings-tool ${checked ? 'is-on' : ''}`}>
      <span className="tk-settings-icon" style={{ '--tool-accent': accent }}>{createElement(icon, { size: 23 })}</span>
      <span className="tk-settings-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="tk-settings-state">{checked ? 'Available' : 'Hidden'}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="tk-settings-switch" aria-hidden><span /></span>
    </label>
  );
}

export default function AdminSettings() {
  const [tools, setTools] = useState({ hatEnabled: false, stickerEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminGetStudioSettings()
      .then((data) => setTools(data.studioTools || tools))
      .catch((error) => toast.error(error.message || 'Could not load studio settings'))
      .finally(() => setLoading(false));
    // The defaults are stable and only used if the server has no settings yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const data = await api.adminSaveStudioSettings(tools);
      setTools(data.studioTools);
      toast.success('Studio availability saved');
    } catch (error) {
      toast.error(error.message || 'Could not save studio settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Admin Settings"
      description="Control which product creators are available without removing existing work."
      action={<button type="button" className="btn btn-primary" onClick={save} disabled={loading || saving}><Save size={16} /> {saving ? 'Saving…' : 'Save settings'}</button>}
    >
      {loading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="tk-settings-wrap">
          <section className="card tk-settings-card">
            <header className="tk-settings-head">
              <span><SlidersHorizontal size={19} /></span>
              <div><h2>Studio availability</h2><p>These switches control new product creation and the product picker inside Truekin Studio.</p></div>
            </header>
            <div className="tk-settings-list">
              <ToolToggle
                icon={Sticker}
                title="Sticker creator"
                description="Let admins create a sticker line with editable artwork, product images, and a dimensional 3D proof."
                checked={tools.stickerEnabled}
                onChange={(checked) => setTools((current) => ({ ...current, stickerEnabled: checked }))}
                accent="#446343"
              />
              <ToolToggle
                icon={Box}
                title="Hat creator"
                description="Temporarily hide hats from new-drop creation. Existing hat products remain safe and editable."
                checked={tools.hatEnabled}
                onChange={(checked) => setTools((current) => ({ ...current, hatEnabled: checked }))}
                accent="#c8301f"
              />
            </div>
          </section>
          <aside className="tk-settings-note">
            <strong>Current storefront behavior</strong>
            <p>Changing this setting controls creation tools only. It will not delete, unpublish, or alter products already in the catalog.</p>
          </aside>
        </div>
      )}
      <style>{`
        .tk-settings-wrap{max-width:940px;display:grid;gap:18px}.tk-settings-card{padding:0;overflow:hidden}.tk-settings-head{display:flex;gap:14px;align-items:flex-start;padding:24px 26px;border-bottom:1px solid var(--border);background:var(--surface)}.tk-settings-head>span{width:40px;height:40px;display:grid;place-items:center;background:var(--ink);color:#fff;border-radius:8px}.tk-settings-head h2{font-family:var(--font-display);font-size:25px;font-weight:400;letter-spacing:.04em;text-transform:uppercase}.tk-settings-head p{margin-top:6px;color:var(--text-secondary);font-size:13px;line-height:1.55}.tk-settings-list{padding:10px 26px 26px}.tk-settings-tool{display:grid;grid-template-columns:auto 1fr auto auto;gap:16px;align-items:center;padding:20px 0;border-bottom:1px solid var(--border);cursor:pointer}.tk-settings-tool:last-child{border-bottom:0}.tk-settings-icon{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--border);color:var(--tool-accent);background:color-mix(in srgb,var(--tool-accent) 8%,white);border-radius:8px}.tk-settings-copy{display:grid;gap:5px}.tk-settings-copy strong{font-size:15px}.tk-settings-copy>span{color:var(--text-secondary);font-size:13px;line-height:1.5;max-width:570px}.tk-settings-state{font-family:var(--font-secondary);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)}.tk-settings-tool.is-on .tk-settings-state{color:#286e48}.tk-settings-tool input{position:absolute;opacity:0;pointer-events:none}.tk-settings-switch{width:48px;height:27px;padding:3px;background:#bbb7ab;border-radius:999px;transition:.2s}.tk-settings-switch span{display:block;width:21px;height:21px;background:#fff;border-radius:50%;box-shadow:0 1px 4px #0003;transition:.2s}.tk-settings-tool.is-on .tk-settings-switch{background:#446343}.tk-settings-tool.is-on .tk-settings-switch span{transform:translateX(21px)}.tk-settings-tool:focus-within{outline:2px solid var(--accent);outline-offset:3px}.tk-settings-note{padding:18px 20px;border-left:4px solid var(--ink);background:#ebe6db}.tk-settings-note strong{font-family:var(--font-secondary);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.tk-settings-note p{margin-top:7px;color:var(--text-secondary);font-size:13px;line-height:1.55}@media(max-width:700px){.tk-settings-list{padding:8px 18px 20px}.tk-settings-tool{grid-template-columns:auto 1fr auto}.tk-settings-state{display:none}.tk-settings-copy>span{font-size:12px}.tk-settings-head{padding:20px 18px}}
      `}</style>
    </AdminLayout>
  );
}

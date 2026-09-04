import { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { PickupLocationDetails } from '../../components/PickupDetails';
import { api } from '../../api/client';

const emptyLocation = { name: '', street: '', city: '', state: '', zip: '', country: 'US', hours: '', instructions: '', contactPerson: '', contactEmail: '', active: true };
const fields = [
  ['name', 'Location name', 'e.g. Studio pickup', 120],
  ['street', 'Street address', 'Street and suite number', 200],
  ['city', 'City', 'City', 100], ['state', 'State / province', 'State', 100],
  ['zip', 'ZIP / postal code', 'Postal code', 20], ['country', 'Country code', 'US', 2],
];

export default function PickupLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLocation);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    api.adminGetPickupLocations().then(({ locations: data }) => { if (!ignore) setLocations(data); })
      .catch((err) => { if (!ignore) setError(err.message); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const edit = (location) => {
    setForm(location ? { ...emptyLocation, ...location } : { ...emptyLocation });
    setEditing(location?._id || 'new');
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { location } = await api.adminSavePickupLocation(editing === 'new' ? null : editing, form);
      setLocations((current) => [...current.filter((item) => item._id !== location._id), location].sort((a, b) => a.name.localeCompare(b.name)));
      setEditing(null);
      toast.success('Pickup location saved');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout title="Pickup locations" description="Set the place. Make pickup simple." action={<button className="btn btn-primary" disabled={saving || !!editing} onClick={() => edit(null)}><Plus size={16} /> Add location</button>}>
      <div className="pickup-admin-intro"><MapPin size={24} /><div><strong>A clear handoff, every time.</strong><p>Customers choose an active location at checkout. Add hours and arrival instructions so they know exactly where to go.</p></div></div>
      {editing && (
        <form className="card pickup-editor" onSubmit={save}>
          <div className="pickup-section-heading"><h2>{editing === 'new' ? 'New pickup location' : 'Edit pickup location'}</h2></div>
          <fieldset disabled={saving} className="pickup-fieldset">
            <div className="pickup-form-grid">
              {fields.map(([name, label, placeholder, max]) => <div className={`form-group pickup-field-${name}`} key={name}>
                <label htmlFor={`location-${name}`}>{label}</label><input id={`location-${name}`} className="input" required maxLength={max} value={form[name]} placeholder={placeholder} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
              </div>)}
            </div>
            <div className="form-group"><label htmlFor="location-contactPerson">Pickup contact <span className="text-muted">(optional)</span></label><input id="location-contactPerson" className="input" maxLength={120} placeholder="Tone Velez" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="location-contactEmail">Contact email <span className="text-muted">(optional)</span></label><input id="location-contactEmail" type="email" className="input" maxLength={200} placeholder="Admin@Truking.com" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /><p className="pickup-help">Who the customer coordinates pickup and payment with. Leave blank to use Tone Velez · Admin@Truking.com.</p></div>
            <div className="form-group"><label htmlFor="location-hours">Pickup hours <span className="text-muted">(optional)</span></label><textarea id="location-hours" className="input" rows={2} maxLength={500} placeholder="Days, hours, and time zone, or appointment details" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="location-instructions">Pickup instructions <span className="text-muted">(optional)</span></label><textarea id="location-instructions" className="input" rows={4} maxLength={2000} placeholder="Where to park, which entrance to use, and what to bring." value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /><p className="pickup-help">Shown at checkout and saved with new orders. You can add instructions for a specific order from its order page.</p></div>
            <label className="pickup-active-toggle"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span><strong>Available for pickup</strong><small>Turn off to hide this location from new orders. Existing orders keep their saved details.</small></span></label>
            <div className="pickup-editor-actions"><button type="submit" className="btn btn-primary"><Save size={16} />{saving ? 'Saving…' : 'Save location'}</button><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button></div>
          </fieldset>
        </form>
      )}
      {loading ? <div className="loading-page"><div className="spinner" /></div> : error ? <p role="alert">{error} <button className="btn btn-secondary" onClick={() => window.location.reload()}>Try again</button></p> : locations.length === 0 ? (
        <div className="card pickup-empty"><MapPin size={32} /><h2>Your first pickup spot</h2><p>Add a location to offer free pickup at checkout.</p>{!editing && <button className="btn btn-primary" onClick={() => edit(null)}><Plus size={16} /> Add location</button>}</div>
      ) : <div className="pickup-locations-grid">{locations.map((location) => <article className="card pickup-location-card" key={location._id}>
        <div className="pickup-section-heading"><h2>{location.name}</h2><span className={`badge ${location.active ? 'badge-success' : 'badge-gray'}`}>{location.active ? 'Active' : 'Inactive'}</span></div>
        <PickupLocationDetails location={location} />
        <button className="btn btn-secondary" disabled={saving || !!editing} onClick={() => edit(location)}><Pencil size={14} /> Edit {location.name}</button>
      </article>)}</div>}
    </AdminLayout>
  );
}

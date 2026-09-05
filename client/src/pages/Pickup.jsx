import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShoppingBag, Clock, PackageCheck } from 'lucide-react';
import { PickupLocationDetails, PickupCoordinator } from '../components/PickupDetails';
import { api } from '../api/client';

export default function Pickup() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let ignore = false;
    api.getPickupLocations().then((data) => { if (!ignore) setLocations(data.locations); })
      .catch(() => { if (!ignore) setError('We couldn’t load pickup locations. Please try again.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);
  return <div className="page"><div className="container" style={{ maxWidth: 1080 }}>
    <header className="pickup-hero"><span className="seal"><MapPin size={14} /> Local pickup</span><h1>Made for you.<br /><span>Picked up by you.</span></h1><p>Choose pickup at checkout and we’ll take it from there — we’ll coordinate your order, the pickup spot, and a time that works for you. Pickup is free, and you can pay online or when you collect it.</p><Link to="/shop" className="btn btn-primary">Shop the tees <ShoppingBag size={16} /></Link></header>
    <div className="pickup-how-it-works">{[[ShoppingBag, '01', 'Choose pickup', 'Select pickup at checkout. Naming a preferred spot is optional.'], [Clock, '02', 'We’ll coordinate', 'We’ll reach out to arrange the pickup spot, the timing, and payment if you’re paying on collection.'], [PackageCheck, '03', 'Make it yours', 'Wait until your order says ready, then bring your order number.']].map(([Icon, number, title, description]) => <div key={number}><span className="pickup-step-number">{number}</span><Icon size={22} /><h2>{title}</h2><p>{description}</p></div>)}</div>
    <PickupCoordinator />
    <div className="pickup-section-heading"><h2>Where we hand off</h2></div>
    {loading ? <p role="status">Loading locations…</p> : error ? <p role="alert">{error} <button className="btn btn-secondary" onClick={() => window.location.reload()}>Try again</button></p> : locations.length ? <div className="pickup-locations-grid">{locations.map((location) => <article className="card pickup-location-card" key={location._id}><div className="pickup-section-heading"><h2>{location.name}</h2><span className="badge badge-success">Free pickup</span></div><PickupLocationDetails location={location} /></article>)}</div> : <div className="card pickup-empty"><MapPin size={30} /><h2>We’ll arrange your spot</h2><p>We don’t list set locations right now. Choose pickup at checkout and we’ll coordinate a spot and time with you directly.</p><Link to="/shop" className="btn btn-secondary">Browse the shop</Link></div>}
  </div></div>;
}

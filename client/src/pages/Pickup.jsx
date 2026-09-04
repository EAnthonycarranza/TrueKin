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
    <header className="pickup-hero"><span className="seal"><MapPin size={14} /> Local pickup</span><h1>Made for you.<br /><span>Picked up by you.</span></h1><p>Choose a pickup spot at checkout. We’ll prepare your order, and you can collect it when it’s ready. Pickup is free. Pay online or when you collect your order.</p><Link to="/shop" className="btn btn-primary">Shop the tees <ShoppingBag size={16} /></Link></header>
    <div className="pickup-how-it-works">{[[ShoppingBag, '01', 'Choose your spot', 'Select pickup and a location at checkout.'], [Clock, '02', 'Wait until it’s ready', 'Check your order status before heading out.'], [PackageCheck, '03', 'Make it yours', 'Follow the location instructions and bring your order number.']].map(([Icon, number, title, description]) => <div key={number}><span className="pickup-step-number">{number}</span><Icon size={22} /><h2>{title}</h2><p>{description}</p></div>)}</div>
    <PickupCoordinator />
    <div className="pickup-section-heading"><h2>Find your pickup spot</h2></div>
    {loading ? <p role="status">Loading locations…</p> : error ? <p role="alert">{error} <button className="btn btn-secondary" onClick={() => window.location.reload()}>Try again</button></p> : locations.length ? <div className="pickup-locations-grid">{locations.map((location) => <article className="card pickup-location-card" key={location._id}><div className="pickup-section-heading"><h2>{location.name}</h2><span className="badge badge-success">Free pickup</span></div><PickupLocationDetails location={location} /></article>)}</div> : <div className="card pickup-empty"><MapPin size={30} /><h2>Pickup is coming soon</h2><p>No pickup locations are currently available. You can still choose shipping at checkout.</p><Link to="/shop" className="btn btn-secondary">Browse the shop</Link></div>}
  </div></div>;
}

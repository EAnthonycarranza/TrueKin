/**
 * Dev-only playground for the 3D shirt studio (route: /dev/shirt-studio).
 * Only mounted when import.meta.env.DEV is true — never in production builds.
 */
import { useState } from 'react';
import Shirt3DStudio from '../../components/shirt3d/Shirt3DStudio';
import Shirt3DPreview from '../../components/shirt3d/Shirt3DPreview';

export default function ShirtStudioDev() {
  const [saved, setSaved] = useState(null);
  const [shots, setShots] = useState([]);

  return (
    <div className="page">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Shirt 3D Studio · dev</h1>
          <p style={{ color: '#666', margin: '4px 0 0' }}>Local playground. Save → the customer preview below renders the saved design.</p>
        </div>

        <Shirt3DStudio
          designData={null}
          onSave={(blob, state) => {
            setSaved(JSON.stringify(state));
            setShots((prev) => [URL.createObjectURL(blob), ...prev].slice(0, 6));
          }}
          onSnapshot={(blob) => setShots((prev) => [URL.createObjectURL(blob), ...prev].slice(0, 6))}
        />

        {shots.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px' }}>Captures</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {shots.map((src) => (
                <img key={src} src={src} alt="capture" style={{ width: 180, height: 200, objectFit: 'contain', background: '#fff', border: '1px solid #eee', borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}

        {saved && (
          <div>
            <h3 style={{ margin: '0 0 8px' }}>Customer preview (Shirt3DPreview)</h3>
            <div style={{ maxWidth: 520 }}>
              <Shirt3DPreview designData={saved} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

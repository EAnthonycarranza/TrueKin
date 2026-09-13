/**
 * Dev-only playground for the 3D shirt studio (route: /dev/shirt-studio).
 * Only mounted when import.meta.env.DEV is true — never in production builds.
 */
import { useEffect, useRef, useState } from 'react';
import UnifiedStudio from '../../components/studio/UnifiedStudio';
import UnifiedPreview from '../../components/studio/UnifiedPreview';

export default function ShirtStudioDev() {
  const [saved, setSaved] = useState(null);
  const [shots, setShots] = useState([]);
  const shotUrls = useRef([]);
  useEffect(() => () => shotUrls.current.forEach(url => URL.revokeObjectURL(url)), []);
  const capture = blob => {
    const url = URL.createObjectURL(blob);
    shotUrls.current.push(url);
    setShots(prev => [url, ...prev].slice(0, 6));
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1500, padding: '0 clamp(10px, 3vw, 40px)', margin: '0 auto' }}>
        <div>
          <h1 style={{ margin: 0 }}>The creative playground</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>T-shirts and hats. One workspace, every angle. This playground does not change your catalog.</p>
        </div>

        <UnifiedStudio
          designData={null}
          onSave={(blob, state) => {
            setSaved(JSON.stringify(state));
            capture(blob);
            return { persisted: false, message: 'Preview updated. Your editable design is kept as a device draft; this playground does not publish products.' };
          }}
          onSnapshot={capture}
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
            <h3 style={{ margin: '0 0 8px' }}>Saved customer preview</h3>
            <div style={{ maxWidth: 520 }}>
              <UnifiedPreview designData={saved} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

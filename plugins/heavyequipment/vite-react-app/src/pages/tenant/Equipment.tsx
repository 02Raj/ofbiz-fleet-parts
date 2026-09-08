import React, { useEffect, useState } from 'react';
import { ofbizFetch } from '../../api/client';
import type { Equipment } from '../../api/types';

export const EquipmentDirectory: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ofbizFetch<Equipment[]>('/equipment?action=list')
      .then(data => {
        setEquipment(Array.isArray(data) ? data : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2>Equipment Directory</h2>
      {error && <div className="text-error mb-4">{error}</div>}
      
      <div className="ui-card">
        {loading ? (
          <p>Loading equipment...</p>
        ) : equipment.length === 0 ? (
          <p className="text-muted">No equipment found.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>Asset ID</th>
                <th style={{ padding: '0.75rem' }}>Name</th>
                <th style={{ padding: '0.75rem' }}>Serial Number</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map(eq => (
                <tr key={eq.fixedAssetId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem' }}>{eq.fixedAssetId}</td>
                  <td style={{ padding: '0.75rem' }}>{eq.fixedAssetName}</td>
                  <td style={{ padding: '0.75rem' }}>{eq.serialNumber || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

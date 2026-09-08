import React, { useEffect, useState } from 'react';
import { ofbizFetch } from '../../api/client';
import type { Supplier } from '../../api/types';

export const SuppliersList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ofbizFetch<Supplier[]>('/suppliers?action=list')
      .then(data => {
        setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2>Suppliers</h2>
      {error && <div className="text-error mb-4">{error}</div>}
      
      <div className="ui-card">
        {loading ? (
          <p>Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <p className="text-muted">No suppliers found.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>Party ID</th>
                <th style={{ padding: '0.75rem' }}>Group Name</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.partyId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem' }}>{sup.partyId}</td>
                  <td style={{ padding: '0.75rem' }}>{sup.groupName || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

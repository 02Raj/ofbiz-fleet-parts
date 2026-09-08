import React, { useEffect, useState } from 'react';
import { ofbizFetch } from '../../api/client';
import type { InventoryItem } from '../../api/types';
import { PackageSearch } from 'lucide-react';

export const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // For the MVP UI, we'll fetch inventory for a hardcoded facility or allow a basic search
  // Currently, the API expects facilityId and productId. We'll fetch a list if supported, 
  // but since our API is `api/inventory/warehouse`, it might need specific IDs.
  // Actually, our API takes facilityId and productId. Let's build a quick search form.
  
  const [facilityId, setFacilityId] = useState('WebStoreWarehouse');
  const [productId, setProductId] = useState('EX_1000');

  const checkInventory = () => {
    setLoading(true);
    setError('');
    
    ofbizFetch<InventoryItem>(`/inventory/warehouse?facilityId=${facilityId}&productId=${productId}`)
      .then(data => {
        if (data && data.productId) {
          setInventory([data]);
        } else {
          setInventory([]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkInventory();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Inventory Management</h2>
      </div>

      <div className="ui-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Check Availability (QOH / ATP)</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Facility ID</label>
            <input 
              value={facilityId}
              onChange={e => setFacilityId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Product ID</label>
            <input 
              value={productId}
              onChange={e => setProductId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <button 
            onClick={checkInventory}
            style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-primary-600)', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackageSearch className="w-4 h-4" />
            Check
          </button>
        </div>
      </div>

      {error && <div className="text-error mb-4">{error}</div>}
      
      <div className="ui-card">
        {loading ? (
          <p>Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <p className="text-muted">No inventory found for these parameters.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>Product ID</th>
                <th style={{ padding: '0.75rem' }}>Facility ID</th>
                <th style={{ padding: '0.75rem' }}>QOH (On Hand)</th>
                <th style={{ padding: '0.75rem' }}>ATP (Available)</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{item.productId}</td>
                  <td style={{ padding: '0.75rem' }}>{item.facilityId}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--color-gray-700)' }}>{item.quantityOnHandTotal}</td>
                  <td style={{ padding: '0.75rem', color: item.availableToPromiseTotal > 0 ? 'var(--color-success)' : 'var(--color-error)' , fontWeight: 600 }}>
                    {item.availableToPromiseTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

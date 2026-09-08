import React, { useState } from 'react';
import { ofbizFetch } from '../../api/client';
import { Wrench } from 'lucide-react';

export const WorkOrders: React.FC = () => {
  const [fixedAssetId, setFixedAssetId] = useState('DEMO_VEH_1');
  const [description, setDescription] = useState('Routine Maintenance');
  const [parts, setParts] = useState('EX_1000:1');
  const [facilityId, setFacilityId] = useState('WebStoreWarehouse');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success?: boolean, workEffortId?: string, reservedParts?: any, error?: string} | null>(null);

  const createWO = () => {
    setLoading(true);
    setResult(null);
    
    const url = `/work-orders?action=create&fixedAssetId=${fixedAssetId}&description=${encodeURIComponent(description)}&parts=${encodeURIComponent(parts)}&facilityId=${facilityId}`;
    
    ofbizFetch<any>(url, { method: 'POST' })
      .then(data => {
        setResult(data);
      })
      .catch(err => setResult({ error: err.message }))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Maintenance & Work Orders</h2>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Create WO Form */}
        <div className="ui-card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Create Work Order (with Auto-Part Reservation)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Equipment ID (Fixed Asset)</label>
              <input 
                value={fixedAssetId}
                onChange={e => setFixedAssetId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</label>
              <input 
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Parts Required (Format: ProductId:Qty, ProductId:Qty)</label>
              <input 
                value={parts}
                onChange={e => setParts(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Warehouse (For Parts)</label>
              <input 
                value={facilityId}
                onChange={e => setFacilityId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <button 
              onClick={createWO}
              disabled={loading}
              style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-600)', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
              <Wrench className="w-4 h-4" />
              {loading ? 'Processing...' : 'Create Work Order'}
            </button>
          </div>
        </div>

        {/* Results / Status */}
        <div style={{ flex: 1 }}>
          {result && (
            <div className="ui-card" style={{ backgroundColor: result.error ? 'var(--color-error)' : 'var(--color-success)', color: 'white', padding: '1rem', border: 'none' }}>
              <h3 style={{ color: 'white', margin: 0, marginBottom: '0.5rem' }}>
                {result.error ? 'Failed to Create WO' : 'Work Order Created'}
              </h3>
              {result.error ? (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>{result.error}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span><strong>Work Order ID:</strong> {result.workEffortId}</span>
                  <span style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
                    <strong>Parts Reservation:</strong>
                    <pre style={{ background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                      {JSON.stringify(result.reservedParts, null, 2)}
                    </pre>
                  </span>
                </div>
              )}
            </div>
          )}
          
          {!result && (
            <div className="ui-card" style={{ backgroundColor: 'var(--color-gray-50)', border: '1px dashed var(--color-gray-300)' }}>
              <p className="text-muted" style={{ margin: 0, textAlign: 'center' }}>Submit the form to generate a Work Order and automatically reserve inventory parts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

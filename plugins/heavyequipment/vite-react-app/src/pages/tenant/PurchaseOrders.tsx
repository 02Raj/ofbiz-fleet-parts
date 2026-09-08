import React, { useState } from 'react';
import { ofbizFetch } from '../../api/client';
import { ShoppingCart } from 'lucide-react';

export const PurchaseOrders: React.FC = () => {
  const [supplierId, setSupplierId] = useState('DemoSupplier');
  const [facilityId, setFacilityId] = useState('WebStoreWarehouse');
  const [productId, setProductId] = useState('EX_1000');
  const [quantity, setQuantity] = useState('10');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success?: boolean, orderId?: string, error?: string} | null>(null);

  const createPO = () => {
    setLoading(true);
    setResult(null);
    
    // API expects parameters for POST/GET, our ofbizFetch uses fetch
    const url = `/purchase-orders?supplierId=${supplierId}&facilityId=${facilityId}&productId=${productId}&quantity=${quantity}`;
    
    ofbizFetch<any>(url, { method: 'POST' })
      .then(data => {
        setResult(data);
      })
      .catch(err => setResult({ error: err.message }))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Procurement & Purchase Orders</h2>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Create PO Form */}
        <div className="ui-card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Create Quick PO</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Supplier Party ID</label>
              <input 
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Destination Facility ID</label>
              <input 
                value={facilityId}
                onChange={e => setFacilityId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Product ID</label>
              <input 
                value={productId}
                onChange={e => setProductId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Quantity</label>
              <input 
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>

            <button 
              onClick={createPO}
              disabled={loading}
              style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-600)', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
              <ShoppingCart className="w-4 h-4" />
              {loading ? 'Processing...' : 'Create Auto-Approved PO'}
            </button>
          </div>
        </div>

        {/* Results / Status */}
        <div style={{ flex: 1 }}>
          {result && (
            <div className="ui-card" style={{ backgroundColor: result.error ? 'var(--color-error)' : 'var(--color-success)', color: 'white', padding: '1rem', border: 'none' }}>
              <h3 style={{ color: 'white', margin: 0, marginBottom: '0.5rem' }}>
                {result.error ? 'Failed to Create PO' : 'PO Created Successfully'}
              </h3>
              {result.error ? (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)' }}>{result.error}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span><strong>Order ID:</strong> {result.orderId}</span>
                  <span><strong>Status:</strong> Approved</span>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.5rem' }}>The inventory will now be in expected status. Next step is to receive it via Goods Receipt API.</span>
                </div>
              )}
            </div>
          )}
          
          {!result && (
            <div className="ui-card" style={{ backgroundColor: 'var(--color-gray-50)', border: '1px dashed var(--color-gray-300)' }}>
              <p className="text-muted" style={{ margin: 0, textAlign: 'center' }}>Submit the form to generate a PO. The result will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

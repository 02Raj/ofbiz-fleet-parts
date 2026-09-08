import React, { useEffect, useState } from 'react';
import { ofbizFetch } from '../../api/client';
import type { Equipment, Supplier } from '../../api/types';
import { Truck, Users, Activity } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [equipmentCount, setEquipmentCount] = useState<number | null>(null);
  const [supplierCount, setSupplierCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch summary stats
    ofbizFetch<Equipment[]>('/equipment?action=list').then(data => {
      setEquipmentCount(Array.isArray(data) ? data.length : 0);
    }).catch(() => setEquipmentCount(0));

    ofbizFetch<Supplier[]>('/suppliers?action=list').then(data => {
      setSupplierCount(Array.isArray(data) ? data.length : 0);
    }).catch(() => setSupplierCount(0));
  }, []);

  const statCardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="ui-card" style={statCardStyle}>
          <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)' }}>
            <Truck className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {equipmentCount !== null ? equipmentCount : '...'}
            </div>
            <div className="text-muted text-sm">Active Equipment</div>
          </div>
        </div>

        <div className="ui-card" style={statCardStyle}>
          <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--color-primary-50)' }}>
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {supplierCount !== null ? supplierCount : '...'}
            </div>
            <div className="text-muted text-sm">Registered Suppliers</div>
          </div>
        </div>

        <div className="ui-card" style={statCardStyle}>
          <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}>
            <Activity className="w-6 h-6 text-inverse" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>Online</div>
            <div className="text-muted text-sm">System Status</div>
          </div>
        </div>
      </div>
    </div>
  );
};

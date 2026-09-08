import React, { useEffect, useState, useCallback } from 'react';
import { ofbizFetch } from '../../api/client';
import { Search, Plus, Eye, Edit3, Trash2, X, Link2, ChevronLeft, ChevronRight } from 'lucide-react';

// Types
interface Part {
  productId: string;
  productName: string;
  internalName: string;
  description: string;
  brandName: string;
  productWeight: number | null;
  quantityUomId: string;
  statusId: string;
  crossRefCount: number;
  compatCount: number;
}

interface CrossRef {
  crossRefId: string;
  crossRefType: string;
  crossRefPartNumber: string;
  crossRefBrand: string;
  crossRefProductId: string;
  notes: string;
}

interface PartDetail extends Part {
  crossReferences: CrossRef[];
  compatibleEquipment: { fixedAssetId: string; fixedAssetName: string; serialNumber: string; comments: string }[];
}

interface PartsResponse {
  parts: Part[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

// Badge colors for status
const statusColors: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: '#dcfce7', color: '#166534' },
  INACTIVE: { bg: '#fef3c7', color: '#92400e' },
  OBSOLETE: { bg: '#fee2e2', color: '#991b1b' },
  SUPERSEDED: { bg: '#e0e7ff', color: '#3730a3' },
  DISCONTINUED: { bg: '#f3f4f6', color: '#6b7280' },
};

// Badge colors for cross-ref types
const xrefColors: Record<string, { bg: string; color: string }> = {
  OEM: { bg: '#dbeafe', color: '#1e40af' },
  MANUFACTURER: { bg: '#e0e7ff', color: '#4338ca' },
  SUPPLIER: { bg: '#fef3c7', color: '#92400e' },
  ALTERNATE: { bg: '#dcfce7', color: '#166534' },
  SUPERSEDED: { bg: '#fee2e2', color: '#991b1b' },
  CUSTOMER: { bg: '#fce7f3', color: '#9d174d' },
};

export const PartsManagement: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showXrefModal, setShowXrefModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartDetail | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Create form state
  const [formData, setFormData] = useState({
    productName: '', internalName: '', description: '', brandName: '',
    quantityUomId: 'WT_ea', productWeight: '', oemPartNumber: ''
  });

  // Cross-ref form state
  const [xrefForm, setXrefForm] = useState({
    crossRefType: 'OEM', crossRefPartNumber: '', crossRefBrand: '', notes: ''
  });

  // Fetch parts
  const fetchParts = useCallback(() => {
    setLoading(true);
    setError('');
    let url = `/parts?action=list&page=${page}&pageSize=15`;
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

    ofbizFetch<PartsResponse>(url)
      .then(data => {
        setParts(data.parts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, searchTerm]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  // Create Part
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('action', 'create');
      Object.entries(formData).forEach(([k, v]) => { if (v) params.append(k, v); });

      await ofbizFetch(`/parts?${params.toString()}`);
      setShowCreateModal(false);
      setFormData({ productName: '', internalName: '', description: '', brandName: '', quantityUomId: 'WT_ea', productWeight: '', oemPartNumber: '' });
      setSuccessMsg('Part created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchParts();
    } catch (err: any) { setError(err.message); }
  };

  // View Part Detail
  const viewPart = async (productId: string) => {
    try {
      const data = await ofbizFetch<PartDetail>(`/parts?action=get&productId=${productId}`);
      setSelectedPart(data);
      setShowDetailModal(true);
    } catch (err: any) { setError(err.message); }
  };

  // Delete Part (soft)
  const deletePart = async (productId: string) => {
    if (!confirm(`Mark "${productId}" as discontinued?`)) return;
    try {
      await ofbizFetch(`/parts?action=delete&productId=${productId}`);
      setSuccessMsg('Part marked as discontinued');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchParts();
    } catch (err: any) { setError(err.message); }
  };

  // Add Cross-Reference
  const handleAddXref = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    try {
      const params = new URLSearchParams();
      params.append('action', 'add');
      params.append('productId', selectedPart.productId);
      Object.entries(xrefForm).forEach(([k, v]) => { if (v) params.append(k, v); });

      await ofbizFetch(`/parts/cross-ref?${params.toString()}`);
      setShowXrefModal(false);
      setXrefForm({ crossRefType: 'OEM', crossRefPartNumber: '', crossRefBrand: '', notes: '' });
      // Refresh part detail
      viewPart(selectedPart.productId);
    } catch (err: any) { setError(err.message); }
  };

  // Delete Cross-Reference
  const deleteXref = async (crossRefId: string) => {
    if (!selectedPart) return;
    try {
      await ofbizFetch(`/parts/cross-ref?action=delete&crossRefId=${crossRefId}`);
      viewPart(selectedPart.productId);
    } catch (err: any) { setError(err.message); }
  };

  // Shared styles
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--border-radius-md)',
    border: '1px solid var(--border-color)', fontSize: '0.875rem', background: 'var(--bg-surface)',
    transition: 'border-color 0.2s', outline: 'none'
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
    marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em'
  };
  const btnPrimary: React.CSSProperties = {
    padding: '0.625rem 1.25rem', backgroundColor: 'var(--color-primary-600)', color: '#fff',
    border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontWeight: 600,
    fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s'
  };
  const btnGhost: React.CSSProperties = {
    padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'var(--color-gray-500)', borderRadius: 'var(--border-radius-md)', transition: 'all 0.2s'
  };
  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
  };
  const modalContent: React.CSSProperties = {
    background: 'var(--bg-surface)', borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '640px', maxHeight: '90vh',
    overflow: 'auto', padding: '0'
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Parts Master</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {totalCount} parts in catalog
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={btnPrimary}>
          <Plus className="w-4 h-4" /> New Part
        </button>
      </div>

      {/* Success & Error Messages */}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--border-radius-md)', background: '#dcfce7', color: '#166534', fontSize: '0.875rem', fontWeight: 500 }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--border-radius-md)', background: '#fee2e2', color: '#991b1b', fontSize: '0.875rem' }}>
          {error} <button onClick={() => setError('')} style={{ ...btnGhost, float: 'right', padding: '0' }}>✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="ui-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search className="w-4 h-4" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
            <input
              placeholder="Search by part name, SKU, brand, description, or OEM number..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ ...inputStyle, paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading parts...</div>
        ) : parts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {searchTerm ? 'No parts match your search.' : 'No parts found. Create your first part!'}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Part ID / SKU</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>X-Refs</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Compat</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(part => {
                  const status = statusColors[part.statusId] || statusColors.ACTIVE;
                  return (
                    <tr key={part.productId} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>{part.productId}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{part.internalName}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 500 }}>{part.productName}</div>
                        {part.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            {part.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-gray-700)' }}>{part.brandName || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {part.crossRefCount > 0 ? (
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {part.crossRefCount}
                          </span>
                        ) : <span style={{ color: 'var(--color-gray-400)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {part.compatCount > 0 ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {part.compatCount}
                          </span>
                        ) : <span style={{ color: 'var(--color-gray-400)' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem',
                          fontWeight: 600, background: status.bg, color: status.color
                        }}>
                          {part.statusId || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => viewPart(part.productId)} title="View Details" style={btnGhost}><Eye className="w-4 h-4" /></button>
                          <button onClick={() => deletePart(part.productId)} title="Discontinue" style={{ ...btnGhost, color: 'var(--color-error)' }}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', background: 'var(--color-gray-50)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ ...btnGhost, opacity: page === 1 ? 0.4 : 1 }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ ...btnGhost, opacity: page === totalPages ? 0.4 : 1 }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================== CREATE MODAL ==================== */}
      {showCreateModal && (
        <div style={modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Create New Part</h3>
              <button onClick={() => setShowCreateModal(false)} style={btnGhost}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Part Name *</label>
                  <input required value={formData.productName} onChange={e => setFormData(p => ({ ...p, productName: e.target.value }))}
                    placeholder="e.g., Engine Oil Filter - CAT 1R-0739" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>SKU / Internal Name</label>
                  <input value={formData.internalName} onChange={e => setFormData(p => ({ ...p, internalName: e.target.value }))}
                    placeholder="e.g., CAT-1R-0739" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Brand / Manufacturer</label>
                  <input value={formData.brandName} onChange={e => setFormData(p => ({ ...p, brandName: e.target.value }))}
                    placeholder="e.g., Caterpillar" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>OEM Part Number</label>
                  <input value={formData.oemPartNumber} onChange={e => setFormData(p => ({ ...p, oemPartNumber: e.target.value }))}
                    placeholder="e.g., 1R-0739" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Weight</label>
                  <input type="number" step="0.01" value={formData.productWeight} onChange={e => setFormData(p => ({ ...p, productWeight: e.target.value }))}
                    placeholder="kg" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Technical description of the part..."
                    rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowCreateModal(false)}
                  style={{ ...btnPrimary, background: 'var(--color-gray-100)', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={btnPrimary}><Plus className="w-4 h-4" /> Create Part</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      {showDetailModal && selectedPart && (
        <div style={modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={{ ...modalContent, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{selectedPart.productName}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedPart.productId} • {selectedPart.internalName}</span>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={btnGhost}><X className="w-5 h-5" /></button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Part Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ ...labelStyle, marginBottom: '0.125rem' }}>Brand</div>
                  <div style={{ fontWeight: 500 }}>{selectedPart.brandName || '—'}</div>
                </div>
                <div>
                  <div style={{ ...labelStyle, marginBottom: '0.125rem' }}>UOM</div>
                  <div style={{ fontWeight: 500 }}>{selectedPart.quantityUomId || '—'}</div>
                </div>
                <div>
                  <div style={{ ...labelStyle, marginBottom: '0.125rem' }}>Status</div>
                  <span style={{
                    padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem',
                    fontWeight: 600, background: (statusColors[selectedPart.statusId] || statusColors.ACTIVE).bg,
                    color: (statusColors[selectedPart.statusId] || statusColors.ACTIVE).color
                  }}>{selectedPart.statusId || 'ACTIVE'}</span>
                </div>
              </div>

              {selectedPart.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={labelStyle}>Description</div>
                  <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{selectedPart.description}</p>
                </div>
              )}

              {/* Cross-References Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>
                    <Link2 className="w-4 h-4" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    Cross-References ({selectedPart.crossReferences?.length || 0})
                  </h4>
                  <button onClick={() => setShowXrefModal(true)} style={{ ...btnPrimary, padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {selectedPart.crossReferences && selectedPart.crossReferences.length > 0 ? (
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-gray-50)' }}>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Type</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Part Number</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Brand</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Notes</th>
                        <th style={{ padding: '0.5rem 0.75rem', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPart.crossReferences.map(xref => {
                        const xc = xrefColors[xref.crossRefType] || xrefColors.OEM;
                        return (
                          <tr key={xref.crossRefId} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <span style={{ padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: xc.bg, color: xc.color }}>
                                {xref.crossRefType}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>{xref.crossRefPartNumber}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{xref.crossRefBrand || '—'}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{xref.notes || '—'}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <button onClick={() => deleteXref(xref.crossRefId)} style={{ ...btnGhost, color: 'var(--color-error)', padding: '0.25rem' }}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>No cross-references yet.</p>
                )}
              </div>

              {/* Compatible Equipment */}
              {selectedPart.compatibleEquipment && selectedPart.compatibleEquipment.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
                    Compatible Equipment ({selectedPart.compatibleEquipment.length})
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {selectedPart.compatibleEquipment.map(eq => (
                      <div key={eq.fixedAssetId} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{eq.fixedAssetName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {eq.fixedAssetId} {eq.serialNumber ? `• S/N: ${eq.serialNumber}` : ''} {eq.comments ? `• ${eq.comments}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD CROSS-REF MODAL ==================== */}
      {showXrefModal && selectedPart && (
        <div style={modalOverlay} onClick={() => setShowXrefModal(false)}>
          <div style={{ ...modalContent, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Add Cross-Reference</h3>
              <button onClick={() => setShowXrefModal(false)} style={btnGhost}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddXref} style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Adding cross-reference to: <strong>{selectedPart.productName}</strong>
              </p>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Type *</label>
                  <select value={xrefForm.crossRefType} onChange={e => setXrefForm(p => ({ ...p, crossRefType: e.target.value }))}
                    style={inputStyle}>
                    <option value="OEM">OEM</option>
                    <option value="MANUFACTURER">Manufacturer</option>
                    <option value="SUPPLIER">Supplier</option>
                    <option value="ALTERNATE">Alternate</option>
                    <option value="SUPERSEDED">Superseded</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Part Number *</label>
                  <input required value={xrefForm.crossRefPartNumber} onChange={e => setXrefForm(p => ({ ...p, crossRefPartNumber: e.target.value }))}
                    placeholder="e.g., LF17511" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input value={xrefForm.crossRefBrand} onChange={e => setXrefForm(p => ({ ...p, crossRefBrand: e.target.value }))}
                    placeholder="e.g., FleetGuard" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <input value={xrefForm.notes} onChange={e => setXrefForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g., Direct replacement" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowXrefModal(false)}
                  style={{ ...btnPrimary, background: 'var(--color-gray-100)', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" style={btnPrimary}><Plus className="w-4 h-4" /> Add Cross-Reference</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import AdminLayout from '../../components/AdminLayout';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    api.adminGetProducts()
      .then((d) => setProducts(d.products))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteProduct(deleteTarget.id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (product) => {
    try {
      const formData = new FormData();
      formData.append('active', !product.active);
      await api.adminUpdateProduct(product._id, formData);
      toast.success(product.active ? 'Product hidden' : 'Product visible');
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Products">
        <div className="loading-page"><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Products"
      description={`${products.length} ${products.length === 1 ? 'product' : 'products'} in your catalog`}
      action={
        <Link to="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={15} /> Add Product
        </Link>
      }
    >
        <div className="card admin-products-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap admin-mobile-table admin-products-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 72 }}></th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 60 }}>
                      <Search size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>No products yet</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Create your first tee to get started.
                      </p>
                      <Link to="/admin/products/new" className="btn btn-primary btn-sm">
                        <Plus size={15} /> Create Product
                      </Link>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id}>
                      <td className="admin-product-image-cell">
                        {p.imageUrls?.[0] ? (
                          <img
                            src={p.imageUrls[0]}
                            alt=""
                            style={{
                              width: 52,
                              height: 52,
                              objectFit: 'cover',
                              borderRadius: 10,
                              border: '1px solid var(--border)',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 52,
                            height: 52,
                            background: 'var(--accent-light)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                          }}>
                            {p.title.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td data-label="Product" className="admin-product-info-cell">
                        <Link
                          to={`/admin/products/${p._id}`}
                          style={{ fontWeight: 600, color: 'var(--text)' }}
                        >
                          {p.title}
                        </Link>
                        {p.featured && (
                          <span className="badge badge-dark" style={{ marginLeft: 8 }}>Featured</span>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                          {p.editorType === '2d' ? '2D editor' : '3D editor'}
                          {p.shirtStyle && ' · Unisex'}
                        </div>
                      </td>
                      <td data-label="Price" style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                        ${(p.price / 100).toFixed(2)}
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${p.active ? 'badge-success' : 'badge-gray'}`}>
                          {p.active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td data-label="Actions" className="admin-actions-cell">
                        <div className="admin-row-actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <Link to={`/admin/products/${p._id}`} className="btn btn-secondary btn-sm" title="Edit" aria-label={`Edit ${p.title}`}>
                            <Edit size={14} />
                          </Link>
                          <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(p)} title={p.active ? 'Hide' : 'Show'} aria-label={`${p.active ? 'Hide' : 'Show'} ${p.title}`}>
                            {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setDeleteTarget({ id: p._id, title: p.title })}
                            style={{ color: 'var(--danger)' }}
                            title="Delete"
                            aria-label={`Delete ${p.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={modalStyles.overlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              style={modalStyles.closeBtn}
              onClick={() => !deleting && setDeleteTarget(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div style={modalStyles.iconWrap}>
              <AlertTriangle size={32} color="#dc2626" />
            </div>

            <h2 style={modalStyles.title}>Delete Product</h2>
            <p style={modalStyles.message}>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
              This action cannot be undone and will permanently remove the product, its images, and design data.
            </p>

            <div style={modalStyles.actions}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px 28px 24px',
    maxWidth: 420,
    width: '100%',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.2s ease',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 8,
    color: '#111',
  },
  message: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    display: 'flex',
    gap: 12,
  },
};

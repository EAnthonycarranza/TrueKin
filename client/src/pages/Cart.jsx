import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1>Shopping Cart</h1>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <ShoppingBag size={56} color="#d1d5db" />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16, fontSize: 16 }}>
              Your cart is empty
            </p>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 20 }}>
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div style={styles.items}>
              {items.map((item, i) => (
                <div key={i} style={styles.item}>
                  <div style={styles.itemImg}>
                    {item.imageUrl ? (
                      <img
                        src={`${item.imageUrl}`}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : (
                      <div className="img-placeholder" style={{ width: 80, height: 80, fontSize: 11 }}>
                        No img
                      </div>
                    )}
                  </div>
                  <div style={styles.itemInfo}>
                    <Link to={`/product/${item.productId}`} style={styles.itemTitle}>
                      {item.title}
                    </Link>
                    {(item.color || item.size || item.shirtStyle) && (
                      <p style={styles.itemMeta}>
                        {item.shirtStyle && <>{item.shirtStyle === 'womens' ? "Women's" : "Men's"}</>}
                        {item.shirtStyle && item.size && ' · '}
                        {item.size && <>Size: {item.size}</>}
                        {(item.shirtStyle || item.size) && item.color && ' · '}
                        {item.color && (
                          <>
                            <span style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: item.color,
                              border: '1px solid #ccc',
                              verticalAlign: 'middle',
                              marginRight: 2,
                            }} />
                            {item.color}
                          </>
                        )}
                      </p>
                    )}
                    <p style={styles.itemMeta}>Qty: {item.quantity}</p>
                    <p style={styles.itemPrice}>${(item.price / 100).toFixed(2)} each</p>
                  </div>
                  <div style={styles.itemActions}>
                    <div style={styles.qtyGroup}>
                      <button style={styles.qtyBtn} onClick={() => updateQuantity(i, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <span style={styles.qty}>{item.quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateQuantity(i, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </p>
                    <button onClick={() => removeItem(i)} style={styles.removeBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.summary}>
              <div style={styles.summaryRow}>
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>${(totalPrice / 100).toFixed(2)}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Shipping calculated at checkout
              </p>
              <Link to="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Proceed to Checkout <ArrowRight size={18} />
              </Link>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  items: { marginBottom: 32 },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 0',
    borderBottom: '1px solid var(--border)',
  },
  itemImg: { width: 80, height: 80, flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: 600 },
  itemMeta: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },
  itemPrice: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },
  itemActions: { display: 'flex', alignItems: 'center', gap: 20 },
  qtyGroup: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: 6,
  },
  qtyBtn: { background: 'none', border: 'none', padding: '6px 10px', display: 'flex' },
  qty: { fontSize: 14, fontWeight: 500, padding: '0 8px', minWidth: 24, textAlign: 'center' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--danger)', padding: 4 },
  summary: {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 24,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
};

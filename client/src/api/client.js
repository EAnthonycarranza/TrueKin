const API_URL = '/api';

async function request(endpoint, options = {}) {
  const { body, method = 'GET', isFormData = false } = options;

  const config = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (body && !isFormData) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  } else if (body && isFormData) {
    config.body = body; // FormData sets its own content-type
  }

  const res = await fetch(`${API_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Auth
export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Products
  getProducts: (params = '') => request(`/products${params ? '?' + params : ''}`),
  getProduct: (id) => request(`/products/${id}`),

  // Checkout
  createCheckoutSession: (body) => request('/checkout/create-session', { method: 'POST', body }),
  getOrderBySession: (sessionId) => request(`/checkout/order/${sessionId}`),

  // Orders
  getMyOrders: () => request('/orders/my-orders'),
  trackOrders: ({ email, orderId }) => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (orderId) params.set('orderId', orderId);
    return request(`/orders/track?${params.toString()}`);
  },

  // Pickup locations
  getPickupLocations: () => request('/pickup/locations'),
  adminGetPickupLocations: () => request('/pickup/admin/locations'),
  adminSavePickupLocation: (id, body) => request(`/pickup/admin/locations${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body }),
  adminUpdatePickupInstructions: (id, orderInstructions) => request(`/orders/admin/${id}/pickup`, { method: 'PUT', body: { orderInstructions } }),

  // Shipping
  getShippingRates: (body) => request('/shipping/rates', { method: 'POST', body }),
  validateAddress: (body) => request('/shipping/validate-address', { method: 'POST', body }),

  // Quotes (custom-order inquiries)
  submitQuote: (body) => request('/quotes', { method: 'POST', body }),
  adminGetQuotes: () => request('/quotes/admin/all'),
  adminUpdateQuoteStatus: (id, status) =>
    request(`/quotes/admin/${id}/status`, { method: 'PUT', body: { status } }),

  // Reviews
  getReviews: (productId) => request(`/reviews/product/${productId}`),
  submitReview: (body) => request('/reviews', { method: 'POST', body }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),

  // Admin
  adminGetProducts: () => request('/products/admin/all'),
  adminCreateProduct: (formData) =>
    request('/products', { method: 'POST', body: formData, isFormData: true }),
  adminUpdateProduct: (id, formData) =>
    request(`/products/${id}`, { method: 'PUT', body: formData, isFormData: true }),
  adminDeleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  adminRemoveImage: (id, imageUrl) =>
    request(`/products/${id}/remove-image`, { method: 'PUT', body: { imageUrl } }),
  adminSaveDesign: (id, formData) =>
    request(`/products/${id}/design`, { method: 'PUT', body: formData, isFormData: true }),

  adminGetOrders: (status = '', fulfillmentMethod = '') =>
    request(`/orders/admin/all?${new URLSearchParams({ status, fulfillmentMethod })}`),
  adminGetOrder: (id) => request(`/orders/admin/${id}`),
  adminUpdateOrderStatus: (id, status, paymentReceived = false) =>
    request(`/orders/admin/${id}/status`, { method: 'PUT', body: { status, paymentReceived } }),
  adminGetStats: () => request('/orders/admin/stats'),

  adminCreateLabel: (body) => request('/shipping/label', { method: 'POST', body }),
  adminGetOrderRates: (orderId) => request(`/shipping/order/${orderId}/rates`),
  adminGetTracking: (orderId) => request(`/shipping/order/${orderId}/tracking`),
  adminRefundLabel: (orderId) =>
    request(`/shipping/order/${orderId}/refund`, { method: 'POST' }),
  adminListCarriers: () => request('/shipping/carriers'),
};

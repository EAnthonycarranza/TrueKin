import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MyOrders from './pages/MyOrders';
import Quote from './pages/Quote';
import Track from './pages/Track';

import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminProductEdit from './pages/admin/ProductEdit';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';

function AppShell() {
  const location = useLocation();
  // Admin gets its own chrome, no storefront footer.
  const hideFooter = location.pathname.startsWith('/admin');

  return (
    <>
      <Navbar />
      <CartDrawer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/quote" element={<Quote />} />
        <Route path="/track" element={<Track />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute admin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute admin><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/products/new" element={<ProtectedRoute admin><AdminProductEdit /></ProtectedRoute>} />
        <Route path="/admin/products/:id" element={<ProtectedRoute admin><AdminProductEdit /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute admin><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/orders/:id" element={<ProtectedRoute admin><AdminOrderDetail /></ProtectedRoute>} />
      </Routes>
      {!hideFooter && <Footer />}
    </>
  );
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <AppShell />
    </BrowserRouter>
  );
}

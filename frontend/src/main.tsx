import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Home from './pages/Home'
import ProductPage from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import OrderStatus from './pages/OrderStatus'
import OrderLookup from './pages/OrderLookup'
import './styles.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'cart', element: <Cart /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'payment', element: <Payment /> },
      { path: 'order/:id', element: <OrderStatus /> },
      { path: 'orders', element: <OrderLookup /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

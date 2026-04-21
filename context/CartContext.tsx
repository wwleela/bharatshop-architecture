// context/CartContext.tsx — BharatShop OS 2026
// Cart state using useReducer. No Redux, no Zustand — ADR-007.
// Provides: items, total, itemCount, addItem, removeItem, setQty, clearCart

import {
  createContext, useContext, useReducer, useMemo, ReactNode,
} from 'react';
import { CartState, CartAction, CartItem, Product } from '@/types';

// ── Reducer ──────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.product.id === action.product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.product.id === action.product.id
              ? { ...i, qty: i.qty + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { product: action.product, qty: 1 }] };
    }

    case 'REMOVE_ITEM':
      return { items: state.items.filter(i => i.product.id !== action.productId) };

    case 'SET_QTY': {
      if (action.qty <= 0) {
        return { items: state.items.filter(i => i.product.id !== action.productId) };
      }
      return {
        items: state.items.map(i =>
          i.product.id === action.productId ? { ...i, qty: action.qty } : i
        ),
      };
    }

    case 'CLEAR_CART':
      return { items: [] };

    default:
      return state;
  }
}

// ── Context shape ────────────────────────────────────────────

interface CartContextValue {
  items:      CartItem[];
  total:      number;
  itemCount:  number;
  addItem:    (product: Product) => void;
  removeItem: (productId: string) => void;
  setQty:     (productId: string, qty: number) => void;
  clearCart:  () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Derived values — memoised to avoid recalculation on unrelated renders
  const total = useMemo(
    () => state.items.reduce((sum, i) => sum + i.qty * i.product.sell_price, 0),
    [state.items],
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, i) => sum + i.qty, 0),
    [state.items],
  );

  function addItem(product: Product) {
    dispatch({ type: 'ADD_ITEM', product });
  }

  function removeItem(productId: string) {
    dispatch({ type: 'REMOVE_ITEM', productId });
  }

  function setQty(productId: string, qty: number) {
    dispatch({ type: 'SET_QTY', productId, qty });
  }

  function clearCart() {
    dispatch({ type: 'CLEAR_CART' });
  }

  return (
    <CartContext.Provider value={{ items: state.items, total, itemCount, addItem, removeItem, setQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}

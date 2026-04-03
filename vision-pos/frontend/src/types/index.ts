// VisionPOS — TypeScript Interfaces
// Semua tipe data yang digunakan di seluruh aplikasi frontend

export interface User {
  id: number;
  username: string;
  role: 'kasir' | 'admin';
}

export interface Item {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  classId?: number;
  isActive: boolean;
}

export interface CartItem {
  item: Item;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface Transaction {
  id: string;
  sessionId: string;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  cart: Cart;
  payment?: PaymentInfo;
}

export interface PaymentInfo {
  method: 'cash' | 'transfer';
  received: number;
  change: number;
}

export interface Receipt {
  transactionId: string;
  cashierName: string;
  items: CartItem[];
  total: number;
  payment: PaymentInfo;
  timestamp: string;
}

export interface Detection {
  classId: number;
  itemId: string;
  itemName: string;
  confidence: number;
  bbox: [number, number, number, number]; // x1, y1, x2, y2
  addedToCart: boolean;
}

export interface ModelInfo {
  filename: string;
  format: 'pt' | 'onnx';
  loadedAt: string;
  fileSizeKb: number;
}

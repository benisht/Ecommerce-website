// src/data/firebaseService.js
// All Firestore operations for products, orders, and contact queries

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export const fetchProducts = async () => {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addProductToDB = async (product) => {
  const ref = await addDoc(collection(db, 'products'), {
    ...product,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...product };
};

export const updateProductInDB = async (id, data) => {
  await updateDoc(doc(db, 'products', id), data);
};

export const deleteProductFromDB = async (id) => {
  await deleteDoc(doc(db, 'products', id));
};

export const getProductById = async (id) => {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export const placeOrder = async (orderData) => {
  const ref = await addDoc(collection(db, 'orders'), {
    ...orderData,
    paymentStatus: 'pending',   // 'pending' | 'received'
    deliveryStatus: 'pending',  // 'pending' | 'dispatched' | 'delivered'
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const fetchOrders = async (resultLimit = 50) => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(resultLimit));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateOrderStatus = async (orderId, fields) => {
  await updateDoc(doc(db, 'orders', orderId), fields);
};

export const deleteOrder = async (orderId) => {
  await deleteDoc(doc(db, 'orders', orderId));
};

// ─── CONTACT QUERIES ─────────────────────────────────────────────────────────

export const submitContactQuery = async (formData) => {
  await addDoc(collection(db, 'contacts'), {
    ...formData,
    status: 'unread',   // 'unread' | 'read'
    createdAt: serverTimestamp(),
  });
};

export const fetchContactQueries = async (resultLimit = 30) => {
  const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'), limit(resultLimit));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const markQueryRead = async (id) => {
  await updateDoc(doc(db, 'contacts', id), { status: 'read' });
};

export const deleteContactQuery = async (id) => {
  await deleteDoc(doc(db, 'contacts', id));
};

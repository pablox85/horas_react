/**
 * Servicio de persistencia con Firebase Firestore
 * Maneja lectura y escritura de datos en la nube
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const ENTRIES_COLLECTION = 'entries';
const TOTALS_DOC = 'totals/global';

/**
 * Carga entradas desde Firestore, ordenadas por más recientes
 * @returns {Promise<Array>} Array de entradas
 */
export const fetchEntries = async () => {
  try {
    const q = query(
      collection(db, ENTRIES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: data.id ?? docSnap.id,
        ...data,
      };
    });
  } catch (error) {
    console.error('Error al cargar entradas:', error);
    return [];
  }
};

/**
 * Guarda una entrada en Firestore
 * @param {object} entry - Entrada a guardar
 */
export const addEntry = async (entry) => {
  try {
    const entryRef = doc(db, ENTRIES_COLLECTION, String(entry.id));
    await setDoc(entryRef, entry);
  } catch (error) {
    console.error('Error al guardar entrada:', error);
    throw error;
  }
};

/**
 * Elimina una entrada por ID
 * @param {string|number} id - ID de la entrada
 */
export const deleteEntry = async (id) => {
  try {
    await deleteDoc(doc(db, ENTRIES_COLLECTION, String(id)));
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    throw error;
  }
};

/**
 * Limpia todas las entradas en Firestore
 */
export const clearEntries = async () => {
  try {
    const snapshot = await getDocs(collection(db, ENTRIES_COLLECTION));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error al limpiar entradas:', error);
    throw error;
  }
};

/**
 * Guarda totales en Firestore
 * @param {object} totals - Totales a guardar
 */
export const saveTotals = async (totals) => {
  try {
    await setDoc(doc(db, TOTALS_DOC), {
      ...totals,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error al guardar totales:', error);
  }
};

/**
 * Carga los totales guardados en Firestore
 * @returns {Promise<object|null>} Totales o null
 */
export const fetchTotals = async () => {
  try {
    const snap = await getDoc(doc(db, TOTALS_DOC));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error('Error al cargar totales:', error);
    return null;
  }
};

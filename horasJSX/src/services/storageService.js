/**
 * Servicio de persistencia híbrido.
 * Usa Firestore cuando hay configuración disponible y localStorage como fallback.
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
import { db, hasFirebaseConfig } from './firebase';
import { getTenantId } from './tenantService';

const TENANTS_COLLECTION = 'tenants';
const ENTRIES_COLLECTION = 'entries';
const DISTANCE_ENTRIES_COLLECTION = 'distanceEntries';
const TOTALS_COLLECTION = 'totals';
const TOTALS_DOC_ID = 'global';
const LOCAL_ENTRIES_KEY = 'billing-entries';
const LOCAL_DISTANCE_ENTRIES_KEY = 'distance-trip-entries';
const LOCAL_TOTALS_KEY = 'billing-totals';

const isBrowser = typeof window !== 'undefined';

const readLocalJSON = (key, fallback) => {
  if (!isBrowser) return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Error leyendo ${key} desde localStorage:`, error);
    return fallback;
  }
};

const writeLocalJSON = (key, value) => {
  if (!isBrowser) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error guardando ${key} en localStorage:`, error);
  }
};

const removeLocalKey = (key) => {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error eliminando ${key} de localStorage:`, error);
  }
};

const sortByCreatedAtDesc = (entries) =>
  [...entries].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

const getTenantLocalKey = (key) => `${key}:${getTenantId()}`;

const readTenantLocalJSON = (key, fallback) => {
  const tenantValue = readLocalJSON(getTenantLocalKey(key), null);
  if (tenantValue !== null) return tenantValue;
  return readLocalJSON(key, fallback);
};

const writeTenantLocalJSON = (key, value) => {
  writeLocalJSON(getTenantLocalKey(key), value);
};

const removeTenantLocalKey = (key) => {
  removeLocalKey(getTenantLocalKey(key));
};

const getTenantCollection = (collectionName) =>
  collection(db, TENANTS_COLLECTION, getTenantId(), collectionName);

const getTenantDoc = (collectionName, docId) =>
  doc(db, TENANTS_COLLECTION, getTenantId(), collectionName, docId);

const readLocalEntries = () =>
  sortByCreatedAtDesc(readTenantLocalJSON(LOCAL_ENTRIES_KEY, []));

const writeLocalEntries = (entries) => {
  writeTenantLocalJSON(LOCAL_ENTRIES_KEY, sortByCreatedAtDesc(entries));
};

const readLocalDistanceEntries = () =>
  sortByCreatedAtDesc(readTenantLocalJSON(LOCAL_DISTANCE_ENTRIES_KEY, []));

const writeLocalDistanceEntries = (entries) => {
  writeTenantLocalJSON(LOCAL_DISTANCE_ENTRIES_KEY, sortByCreatedAtDesc(entries));
};

/**
 * Carga entradas desde Firestore, ordenadas por más recientes
 * @returns {Promise<Array>} Array de entradas
 */
export const fetchEntries = async () => {
  if (!hasFirebaseConfig || !db) {
    return readLocalEntries();
  }

  try {
    const q = query(
      getTenantCollection(ENTRIES_COLLECTION),
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
    return readLocalEntries();
  }
};

/**
 * Guarda una entrada en Firestore
 * @param {object} entry - Entrada a guardar
 */
export const addEntry = async (entry) => {
  if (!hasFirebaseConfig || !db) {
    const currentEntries = readLocalEntries();
    writeLocalEntries([
      ...currentEntries.filter((item) => String(item.id) !== String(entry.id)),
      entry,
    ]);
    return;
  }

  try {
    const entryRef = getTenantDoc(ENTRIES_COLLECTION, String(entry.id));
    await setDoc(entryRef, entry);
  } catch (error) {
    console.error('Error al guardar entrada:', error);
    const currentEntries = readLocalEntries();
    writeLocalEntries([
      ...currentEntries.filter((item) => String(item.id) !== String(entry.id)),
      entry,
    ]);
    throw error;
  }
};

/**
 * Elimina una entrada por ID
 * @param {string|number} id - ID de la entrada
 */
export const deleteEntry = async (id) => {
  if (!hasFirebaseConfig || !db) {
    const currentEntries = readLocalEntries().filter(
      (entry) => String(entry.id) !== String(id)
    );
    writeLocalEntries(currentEntries);
    return;
  }

  try {
    await deleteDoc(getTenantDoc(ENTRIES_COLLECTION, String(id)));
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    const currentEntries = readLocalEntries().filter(
      (entry) => String(entry.id) !== String(id)
    );
    writeLocalEntries(currentEntries);
    throw error;
  }
};

/**
 * Limpia todas las entradas en Firestore
 */
export const clearEntries = async () => {
  if (!hasFirebaseConfig || !db) {
    removeTenantLocalKey(LOCAL_ENTRIES_KEY);
    removeTenantLocalKey(LOCAL_TOTALS_KEY);
    return;
  }

  try {
    const snapshot = await getDocs(getTenantCollection(ENTRIES_COLLECTION));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error al limpiar entradas:', error);
    removeTenantLocalKey(LOCAL_ENTRIES_KEY);
    removeTenantLocalKey(LOCAL_TOTALS_KEY);
    throw error;
  }
};

/**
 * Guarda totales en Firestore
 * @param {object} totals - Totales a guardar
 */
export const saveTotals = async (totals) => {
  if (!hasFirebaseConfig || !db) {
    writeTenantLocalJSON(LOCAL_TOTALS_KEY, {
      ...totals,
      updatedAt: Date.now(),
    });
    return;
  }

  try {
    await setDoc(getTenantDoc(TOTALS_COLLECTION, TOTALS_DOC_ID), {
      ...totals,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error al guardar totales:', error);
    writeTenantLocalJSON(LOCAL_TOTALS_KEY, {
      ...totals,
      updatedAt: Date.now(),
    });
  }
};

/**
 * Carga los totales guardados en Firestore
 * @returns {Promise<object|null>} Totales o null
 */
export const fetchTotals = async () => {
  if (!hasFirebaseConfig || !db) {
    return readTenantLocalJSON(LOCAL_TOTALS_KEY, null);
  }

  try {
    const snap = await getDoc(getTenantDoc(TOTALS_COLLECTION, TOTALS_DOC_ID));
    return snap.exists() ? snap.data() : readTenantLocalJSON(LOCAL_TOTALS_KEY, null);
  } catch (error) {
    console.error('Error al cargar totales:', error);
    return readTenantLocalJSON(LOCAL_TOTALS_KEY, null);
  }
};

export const fetchDistanceEntries = async () => {
  if (!hasFirebaseConfig || !db) {
    return readLocalDistanceEntries();
  }

  try {
    const q = query(
      getTenantCollection(DISTANCE_ENTRIES_COLLECTION),
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
    console.error('Error al cargar viajes por distancia:', error);
    return readLocalDistanceEntries();
  }
};

export const addDistanceEntry = async (entry) => {
  if (!hasFirebaseConfig || !db) {
    const currentEntries = readLocalDistanceEntries();
    writeLocalDistanceEntries([
      ...currentEntries.filter((item) => String(item.id) !== String(entry.id)),
      entry,
    ]);
    return;
  }

  try {
    await setDoc(getTenantDoc(DISTANCE_ENTRIES_COLLECTION, String(entry.id)), entry);
  } catch (error) {
    console.error('Error al guardar viaje por distancia:', error);
    const currentEntries = readLocalDistanceEntries();
    writeLocalDistanceEntries([
      ...currentEntries.filter((item) => String(item.id) !== String(entry.id)),
      entry,
    ]);
    throw error;
  }
};

export const deleteDistanceEntry = async (id) => {
  if (!hasFirebaseConfig || !db) {
    const currentEntries = readLocalDistanceEntries().filter(
      (entry) => String(entry.id) !== String(id)
    );
    writeLocalDistanceEntries(currentEntries);
    return;
  }

  try {
    await deleteDoc(getTenantDoc(DISTANCE_ENTRIES_COLLECTION, String(id)));
  } catch (error) {
    console.error('Error al eliminar viaje por distancia:', error);
    const currentEntries = readLocalDistanceEntries().filter(
      (entry) => String(entry.id) !== String(id)
    );
    writeLocalDistanceEntries(currentEntries);
    throw error;
  }
};

export const clearDistanceEntries = async () => {
  if (!hasFirebaseConfig || !db) {
    removeTenantLocalKey(LOCAL_DISTANCE_ENTRIES_KEY);
    return;
  }

  try {
    const snapshot = await getDocs(getTenantCollection(DISTANCE_ENTRIES_COLLECTION));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error al limpiar viajes por distancia:', error);
    removeTenantLocalKey(LOCAL_DISTANCE_ENTRIES_KEY);
    throw error;
  }
};

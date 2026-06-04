const DB_NAME = 'lazynext_db';
const STORE_NAME = 'lazynext_store';

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProjectState(projectData: any, assets: any[]) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      id: 'current_project',
      projectData,
      assets: assets.map(a => ({
         id: a.id,
         name: a.name,
         file: a.file,
         peaks: a.peaks
      }))
    };
    
    store.put(data);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadProjectState(): Promise<{ projectData: any, assets: any[] } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current_project');
    
    request.onsuccess = () => {
      if (request.result) {
        resolve({
           projectData: request.result.projectData,
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           assets: (request.result.assets || []).map((a: any) => ({
             ...a,
             url: a.file ? URL.createObjectURL(a.file) : (a.url || '')
           }))
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearProjectState() {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete('current_project');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

(() => {
  const DB_NAME = "FitnessOSDB";
  const DB_VERSION = 1;
  const STORE_NAMES = [
    "exercises",
    "programs",
    "workoutSessions",
    "weightLogs",
    "settings",
    "ongoingWorkout",
  ];

  let dbPromise = null;

  const requestToPromise = (request) => {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    });
  };

  const initDB = async () => {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        STORE_NAMES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    });

    return dbPromise;
  };

  const getStore = async (storeName, mode = "readonly") => {
    const db = await initDB();
    if (!STORE_NAMES.includes(storeName)) {
      throw new Error(`Unknown store: ${storeName}`);
    }

    return db.transaction(storeName, mode).objectStore(storeName);
  };

  const addItem = async (store, data) => {
    const objectStore = await getStore(store, "readwrite");
    const id = await requestToPromise(objectStore.add(data));
    return id;
  };

  const getAllItems = async (store) => {
    const objectStore = await getStore(store, "readonly");
    return requestToPromise(objectStore.getAll());
  };

  const getItem = async (store, id) => {
    const objectStore = await getStore(store, "readonly");
    return requestToPromise(objectStore.get(id));
  };

  const updateItem = async (store, id, data) => {
    const objectStore = await getStore(store, "readwrite");
    const payload = { ...data, id };
    await requestToPromise(objectStore.put(payload));
    return payload;
  };

  const deleteItem = async (store, id) => {
    const objectStore = await getStore(store, "readwrite");
    await requestToPromise(objectStore.delete(id));
    return true;
  };

  window.FitnessDB = {
    initDB,
    addItem,
    getAllItems,
    getItem,
    updateItem,
    deleteItem,
  };
})();

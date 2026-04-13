(function setupFitnessDB() {
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

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    });
  }

  async function initDB() {
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
  }

  async function getStore(storeName, mode = "readonly") {
    const db = await initDB();
    if (!STORE_NAMES.includes(storeName)) {
      throw new Error(`Unknown store: ${storeName}`);
    }

    return db.transaction(storeName, mode).objectStore(storeName);
  }

  async function addItem(store, data) {
    const objectStore = await getStore(store, "readwrite");
    const id = await requestToPromise(objectStore.add(data));
    return id;
  }

  async function getAllItems(store) {
    const objectStore = await getStore(store, "readonly");
    return requestToPromise(objectStore.getAll());
  }

  async function getItem(store, id) {
    const objectStore = await getStore(store, "readonly");
    return requestToPromise(objectStore.get(id));
  }

  async function updateItem(store, id, data) {
    const objectStore = await getStore(store, "readwrite");
    const payload = { ...data, id };
    await requestToPromise(objectStore.put(payload));
    return payload;
  }

  async function deleteItem(store, id) {
    const objectStore = await getStore(store, "readwrite");
    await requestToPromise(objectStore.delete(id));
    return true;
  }

  async function runConsoleTests() {
    await initDB();

    console.log("[IndexedDB Test] DB initialized");

    const before = await getAllItems("exercises");
    console.log("[IndexedDB Test] Existing exercises before add:", before.length);

    const newId = await addItem("exercises", {
      name: "Console Test Exercise",
      createdAt: new Date().toISOString(),
    });
    console.log("[IndexedDB Test] Added exercise with id:", newId);

    const oneItem = await getItem("exercises", newId);
    console.log("[IndexedDB Test] Retrieved by id:", oneItem);

    const updated = await updateItem("exercises", newId, {
      ...oneItem,
      name: "Console Test Exercise (Updated)",
    });
    console.log("[IndexedDB Test] Updated item:", updated);

    const after = await getAllItems("exercises");
    console.log("[IndexedDB Test] Exercises after add/update:", after.length);
    console.log("[IndexedDB Test] Persistence check: if this count grows after refresh, data persisted.");
  }

  window.FitnessDB = {
    initDB,
    addItem,
    getAllItems,
    getItem,
    updateItem,
    deleteItem,
  };

  runConsoleTests().catch((error) => {
    console.error("[IndexedDB Test] Error:", error);
  });
})();

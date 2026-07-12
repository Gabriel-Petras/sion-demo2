(function () {
  const DB_NAME = 'sionVerseDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'verses';
  const SETTINGS_STORE = 'settings';

  function getTodayKey() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const verseStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          verseStore.createIndex('showCount', 'showCount', { unique: false });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function getAllVerses(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = function () {
        resolve(request.result || []);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function getSettings(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('settings');

      request.onsuccess = function () {
        resolve(request.result || { id: 'settings', rotationIndex: 0, lastShownDate: null, selectedVerseId: null });
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function saveSettings(db, settings) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put(settings);

      request.onsuccess = function () {
        resolve();
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function saveVerse(db, verse) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(verse);

      request.onsuccess = function () {
        resolve();
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function createVerseRecord(text, author) {
    return {
      id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'verse-' + Date.now() + '-' + Math.random().toString(16).slice(2),
      text: text.trim(),
      author: author.trim(),
      showCount: 0,
      createdAt: new Date().toISOString()
    };
  }

  function addVerse(text, author) {
    const verse = createVerseRecord(text, author);
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(verse);

        request.onsuccess = function () {
          resolve(verse);
        };

        request.onerror = function () {
          reject(request.error);
        }
      });
    });
  }

  function listVerses() {
    return openDb().then(getAllVerses);
  }

  function selectVerseForToday() {
    return openDb().then(function (db) {
      return getAllVerses(db).then(function (verses) {
        if (!verses.length) {
          return null;
        }

        return getSettings(db).then(function (settings) {
          const today = getTodayKey();

          if (settings.lastShownDate === today && settings.selectedVerseId) {
            return verses.find(function (verse) {
              return verse.id === settings.selectedVerseId;
            }) || null;
          }

          let selectedVerse = null;
          let nextRotationIndex = settings.rotationIndex || 0;

          if (nextRotationIndex < verses.length) {
            selectedVerse = verses[nextRotationIndex];
            nextRotationIndex += 1;
          } else {
            const minimumShows = Math.min.apply(null, verses.map(function (verse) {
              return verse.showCount || 0;
            }));
            const candidates = verses.filter(function (verse) {
              return (verse.showCount || 0) === minimumShows;
            });
            const randomIndex = Math.floor(Math.random() * candidates.length);
            selectedVerse = candidates[randomIndex];
          }

          if (!selectedVerse) {
            return null;
          }

          const updatedVerse = Object.assign({}, selectedVerse, {
            showCount: (selectedVerse.showCount || 0) + 1
          });

          const updatedSettings = Object.assign({}, settings, {
            id: 'settings',
            rotationIndex: nextRotationIndex,
            lastShownDate: today,
            selectedVerseId: selectedVerse.id
          });

          return saveVerse(db, updatedVerse).then(function () {
            return saveSettings(db, updatedSettings).then(function () {
              return updatedVerse;
            });
          });
        });
      });
    });
  }

  function renderVerse() {
    const display = document.getElementById('verse-display');
    const dateBox = document.getElementById('verse-date');

    if (!display) {
      return;
    }

    selectVerseForToday().then(function (verse) {
      if (verse && verse.text) {
        display.textContent = '“' + verse.text + '”';
        if (dateBox) {
          dateBox.textContent = verse.author ? verse.author : 'Stih dana';
        }
      } else {
        display.textContent = 'Nema unetog stiha još.';
        if (dateBox) {
          dateBox.textContent = 'Dodaj stih preko admin stranice';
        }
      }
    });
  }

  window.verseManager = {
    addVerse: addVerse,
    listVerses: listVerses,
    selectVerseForToday: selectVerseForToday
  };

  window.addEventListener('load', renderVerse);
})();

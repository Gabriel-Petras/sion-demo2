(function () {
  const SUPABASE_URL = 'https://odnnztyftzznebwqkvso.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbm56dHlmdHp6bmVid3FrdnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTUxNjEsImV4cCI6MjA5OTQzMTE2MX0.3s9Z5iPKDE4YcjI4ZyBWOjT38uHcwQMv9-0C0Hk0bRU';
  const TABLE_NAME = 'stihovi';
  const SETTINGS_KEY = 'sionVerseSettings';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function getTodayKey() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function normalizeVerse(verse) {
    return {
      id: verse.id,
      text: verse.text || '',
      author: verse.author || '',
      showCount: Number(verse.show_count || 0),
      createdAt: verse.created_at || null
    };
  }

  function getSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        return { rotationIndex: 0, lastShownDate: null, selectedVerseId: null };
      }

      const parsed = JSON.parse(stored);
      return {
        rotationIndex: Number(parsed.rotationIndex || 0),
        lastShownDate: parsed.lastShownDate || null,
        selectedVerseId: parsed.selectedVerseId || null
      };
    } catch (error) {
      return { rotationIndex: 0, lastShownDate: null, selectedVerseId: null };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      // Ignore storage errors and continue.
    }
  }

  async function addVerse(text, author) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        text: text.trim(),
        author: author.trim() || null,
        show_count: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return normalizeVerse(data);
  }

  async function updateVerse(id, text, author) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        text: text.trim(),
        author: author.trim() || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return normalizeVerse(data);
  }

  async function deleteVerse(id) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async function listVerses() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, text, author, show_count, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(normalizeVerse);
  }

  async function selectVerseForToday() {
    const verses = await listVerses();

    if (!verses.length) {
      return null;
    }

    const settings = getSettings();
    const today = getTodayKey();

    if (settings.lastShownDate === today && settings.selectedVerseId) {
      const existingVerse = verses.find(function (verse) {
        return verse.id === settings.selectedVerseId;
      });

      if (existingVerse) {
        return existingVerse;
      }
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

    const updatedSettings = {
      rotationIndex: nextRotationIndex,
      lastShownDate: today,
      selectedVerseId: selectedVerse.id
    };

    saveSettings(updatedSettings);

    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ show_count: (selectedVerse.showCount || 0) + 1 })
      .eq('id', selectedVerse.id);

    if (error) {
      throw error;
    }

    return Object.assign({}, selectedVerse, {
      showCount: (selectedVerse.showCount || 0) + 1
    });
  }

  async function renderVerse() {
    const display = document.getElementById('verse-display');
    const dateBox = document.getElementById('verse-date');

    if (!display) {
      return;
    }

    const modalText = document.getElementById('verse-modal-text');
    const modalAuthor = document.getElementById('verse-modal-author');

    try {
      const verse = await selectVerseForToday();

      if (verse && verse.text) {
        const text = '“' + verse.text + '”';
        display.textContent = text;
        if (dateBox) {
          dateBox.textContent = verse.author ? verse.author : 'Stih dana';
        }
        if (modalText) {
          modalText.textContent = text;
        }
        if (modalAuthor) {
          modalAuthor.textContent = verse.author ? verse.author : 'Stih dana';
        }
      } else {
        display.textContent = 'Nema unetog stiha još.';
        if (dateBox) {
          dateBox.textContent = 'Dodaj stih preko admin stranice';
        }
        if (modalText) {
          modalText.textContent = 'Nema unetog stiha još.';
        }
        if (modalAuthor) {
          modalAuthor.textContent = 'Dodaj stih preko admin stranice';
        }
      }
    } catch (error) {
      display.textContent = 'Nije moguće učitati stih trenutno.';
      if (dateBox) {
        dateBox.textContent = 'Proveri Supabase konekciju i dozvole.';
      }
      if (modalText) {
        modalText.textContent = 'Nije moguće učitati stih trenutno.';
      }
      if (modalAuthor) {
        modalAuthor.textContent = 'Proveri Supabase konekciju i dozvole.';
      }
    }
  }

  window.verseManager = {
    addVerse: addVerse,
    updateVerse: updateVerse,
    deleteVerse: deleteVerse,
    listVerses: listVerses,
    selectVerseForToday: selectVerseForToday
  };

  window.addEventListener('load', renderVerse);
})();

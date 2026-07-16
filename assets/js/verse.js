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
      komentar: verse.komentar || '', // NOVO: Dodato polje komentar
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

  // NOVO: Dodat parametar 'komentar' sa default vrednošću
  async function addVerse(text, author, komentar = '') {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        text: text.trim(),
        author: author.trim() || null,
        komentar: komentar.trim() || null, // NOVO: Čuvanje komentara
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

  // NOVO: Dodat parametar 'komentar' sa default vrednošću
  async function updateVerse(id, text, author, komentar = '') {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        text: text.trim(),
        author: author.trim() || null,
        komentar: komentar.trim() || null // NOVO: Ažuriranje komentara
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
      .select('id, text, author, komentar, show_count, created_at')
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

    const today = getTodayKey();
    const settings = getSettings();

    if (settings.lastShownDate === today && settings.selectedVerseId) {
      const existingVerse = verses.find(function (verse) {
        return verse.id === settings.selectedVerseId;
      });

      if (existingVerse) {
        return existingVerse;
      }
    }

    const zeroShowVerses = verses.filter(function (verse) {
      return (verse.showCount || 0) === 0;
    });

    let selectedVerse = null;

    if (zeroShowVerses.length) {
      selectedVerse = zeroShowVerses[zeroShowVerses.length - 1];
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
      lastShownDate: today,
      selectedVerseId: selectedVerse.id
    };

    saveSettings(updatedSettings);

    try {
      await supabase
        .from(TABLE_NAME)
        .update({ show_count: (selectedVerse.showCount || 0) + 1 })
        .eq('id', selectedVerse.id);
    } catch (error) {
      console.warn('Could not update show_count, but verse will still display:', error);
    }

    return Object.assign({}, selectedVerse, {
      showCount: (selectedVerse.showCount || 0) + 1
    });
  }

    async function renderVerse() {
    const display = document.getElementById('verse-display');
    const dateBox = document.getElementById('verse-date');
    const modalText = document.getElementById('verse-modal-text');
    const modalAuthor = document.getElementById('verse-modal-author');
    const modalComment = document.getElementById('verse-modal-comment'); // NOVO

    if (!display) {
      return;
    }

    try {
      const verse = await selectVerseForToday();

      if (verse && verse.text) {
        const text = '“' + verse.text + '”';
        
        // Ažuriraj mali prikaz u zaglavlju
        display.textContent = text;
        if (dateBox) {
          dateBox.textContent = verse.author ? verse.author : 'Stih dana';
        }
        
        // Ažuriraj prošireni prikaz (modal)
        if (modalText) {
          modalText.textContent = text;
        }
        if (modalAuthor) {
          modalAuthor.textContent = verse.author ? verse.author : 'Stih dana';
        }

        // NOVO: Ažuriraj i prikaži komentar ako postoji
        if (modalComment) {
          if (verse.komentar && verse.komentar.trim() !== '') {
            modalComment.textContent = verse.komentar;
            modalComment.style.display = 'block'; // Prikaži ga
          } else {
            modalComment.style.display = 'none'; // Sakrij ga ako je prazan
          }
        }

      } else {
        // Fallback ako nema stihova
        display.textContent = 'Nema unetog stiha još.';
        if (dateBox) dateBox.textContent = 'Dodaj stih preko admin stranice';
        if (modalText) modalText.textContent = 'Nema unetog stiha još.';
        if (modalAuthor) modalAuthor.textContent = 'Dodaj stih preko admin stranice';
        if (modalComment) modalComment.style.display = 'none'; // Sakrij komentar
      }
    } catch (error) {
      // Fallback ako dođe do greške
      console.error("Greška pri učitavanju stiha:", error);
      display.textContent = 'Nije moguće učitati stih trenutno.';
      if (dateBox) dateBox.textContent = 'Proveri Supabase konekciju i dozvole.';
      if (modalText) modalText.textContent = 'Nije moguće učitati stih trenutno.';
      if (modalAuthor) modalAuthor.textContent = 'Proveri Supabase konekciju i dozvole.';
      if (modalComment) modalComment.style.display = 'none'; // Sakrij komentar
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
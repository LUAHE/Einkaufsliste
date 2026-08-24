const STORAGE_KEY = 'marco-shopping-list-v1';
const THEME_KEY = 'marco-shopping-theme-v1';
const state = { items: loadItems(), filter: 'all' };

const el = {
  form: document.querySelector('#itemForm'), name: document.querySelector('#itemName'),
  quantity: document.querySelector('#itemQuantity'), category: document.querySelector('#itemCategory'),
  list: document.querySelector('#shoppingList'), empty: document.querySelector('#emptyState'),
  summary: document.querySelector('#summary'), filters: [...document.querySelectorAll('.filter')],
  dialog: document.querySelector('#optionsDialog'), toast: document.querySelector('#toast')
};

function loadItems() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); render(); }
function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}
function visibleItems() {
  if (state.filter === 'open') return state.items.filter(i => !i.done);
  if (state.filter === 'done') return state.items.filter(i => i.done);
  return state.items;
}
function render() {
  const items = visibleItems();
  el.list.innerHTML = items.map(item => `
    <li class="item ${item.done ? 'done' : ''}" data-id="${item.id}">
      <input class="check" type="checkbox" ${item.done ? 'checked' : ''} aria-label="${escapeHTML(item.name)} erledigt">
      <div class="item-copy">
        <div class="item-name">${escapeHTML(item.name)}</div>
        <div class="item-meta">${escapeHTML(item.quantity || '1')} · ${escapeHTML(item.category)}</div>
      </div>
      <button class="delete-button" type="button" aria-label="${escapeHTML(item.name)} löschen">×</button>
    </li>`).join('');
  el.empty.hidden = items.length > 0;
  const open = state.items.filter(i => !i.done).length;
  const done = state.items.length - open;
  el.summary.textContent = !state.items.length ? 'Noch keine Artikel' : `${open} offen · ${done} erledigt`;
}
function showToast(message) {
  el.toast.textContent = message; el.toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.toast.classList.remove('show'), 1900);
}

el.form.addEventListener('submit', event => {
  event.preventDefault();
  const name = el.name.value.trim(); if (!name) return;
  state.items.unshift({ id: crypto.randomUUID(), name, quantity: el.quantity.value.trim() || '1', category: el.category.value, done: false, createdAt: Date.now() });
  el.form.reset(); el.category.value = 'Lebensmittel'; save(); el.name.focus(); showToast('Artikel hinzugefügt');
});
el.list.addEventListener('change', event => {
  if (!event.target.matches('.check')) return;
  const item = state.items.find(i => i.id === event.target.closest('.item').dataset.id);
  if (item) { item.done = event.target.checked; save(); }
});
el.list.addEventListener('click', event => {
  const button = event.target.closest('.delete-button'); if (!button) return;
  const id = button.closest('.item').dataset.id;
  state.items = state.items.filter(i => i.id !== id); save(); showToast('Artikel gelöscht');
});
el.filters.forEach(button => button.addEventListener('click', () => {
  state.filter = button.dataset.filter; el.filters.forEach(b => b.classList.toggle('active', b === button)); render();
}));
document.querySelector('#moreButton').addEventListener('click', () => el.dialog.showModal());
document.querySelector('#clearDoneButton').addEventListener('click', () => {
  state.items = state.items.filter(i => !i.done); save(); el.dialog.close(); showToast('Erledigte entfernt');
});
document.querySelector('#clearAllButton').addEventListener('click', () => {
  if (state.items.length && confirm('Wirklich die ganze Liste löschen?')) { state.items = []; save(); el.dialog.close(); showToast('Liste gelöscht'); }
});
document.querySelector('#sortButton').addEventListener('click', () => {
  state.items.sort((a,b) => a.category.localeCompare(b.category, 'de') || a.name.localeCompare(b.name, 'de'));
  save(); el.dialog.close(); showToast('Nach Kategorie sortiert');
});
document.querySelector('#shareButton').addEventListener('click', async () => {
  const text = state.items.length ? 'Einkaufsliste\n\n' + state.items.map(i => `${i.done ? '✓' : '○'} ${i.quantity} ${i.name} (${i.category})`).join('\n') : 'Einkaufsliste ist leer.';
  try {
    if (navigator.share) await navigator.share({ title: 'Einkaufsliste', text });
    else { await navigator.clipboard.writeText(text); showToast('Liste kopiert'); }
  } catch (error) { if (error.name !== 'AbortError') showToast('Teilen nicht möglich'); }
  el.dialog.close();
});

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
document.querySelector('#themeButton').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; localStorage.setItem(THEME_KEY, next);
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
render();

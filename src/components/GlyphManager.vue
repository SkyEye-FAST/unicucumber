<template>
  <div class="glyph-manager">
    <h2 class="title">{{ $t('glyph_manager.title') }}</h2>

    <div class="toolbar">
      <div class="search-box">
        <input v-model="searchQuery" :placeholder="$t('glyph_manager.search')" class="search-input" />
      </div>
      <button @click="exportToHex" class="btn-export" :disabled="!props.glyphs.length">
        <span class="material-symbols-outlined">file_download</span>
        {{ $t('glyph_manager.export') }}
      </button>
    </div>

    <div class="add-glyph">
      <div v-if="duplicateGlyph" class="duplicate-warning">
        <p>{{ $t('glyph_manager.duplicate.warning', { codePoint: newGlyph.codePoint }) }}</p>
        <div class="warning-actions">
          <button class="btn-warn" @click="updateExistingGlyph">
            {{ $t('glyph_manager.duplicate.update') }}
          </button>
          <button class="btn-cancel" @click="cancelAdd">
            {{ $t('glyph_manager.duplicate.cancel') }}
          </button>
        </div>
      </div>

      <template v-else>
        <div class="input-group">
          <input v-model="newGlyph.codePoint" :placeholder="$t('glyph_manager.add.code_point')" class="input"
            @input="$event.target.value = $event.target.value.toUpperCase()" />
          <input v-if="!prefillData" v-model="newGlyph.hexValue" :placeholder="$t('glyph_manager.add.hex_value')" class="input"
            @input="$event.target.value = $event.target.value.toUpperCase()" />
          <div v-else class="hex-preview">
            <span class="hex-value">{{ prefillData.hexValue }}</span>
          </div>
        </div>
        <div class="button-group">
          <button @click="handleAdd" class="btn-add" :disabled="!isValidInput" :title="getAddButtonTitle">
            {{ editMode ? $t('glyph_manager.add.update_button') : $t('glyph_manager.add.add_button') }}
          </button>
          <button v-if="!editMode && (newGlyph.hexValue || prefillData)" @click="clearForm" class="btn-clear">
            {{ $t('glyph_manager.add.clear_button') }}
          </button>
        </div>
      </template>
    </div>

    <div class="glyph-list">
      <div v-for="glyph in filteredGlyphs" :key="glyph.codePoint" class="glyph-card">
        <div class="glyph-preview" @click="handleEditInGrid(glyph)"
          :title="$t('glyph_manager.glyph.edit_in_grid', { codePoint: glyph.codePoint })">
          {{ String.fromCodePoint(parseInt(glyph.codePoint, 16)) }}
        </div>
        <div class="glyph-info">
          <div class="info-row">
            <span class="info-label">{{ $t('glyph_manager.glyph.code_point') }}</span>
            <span class="info-value">U+{{ glyph.codePoint }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ $t('glyph_manager.glyph.hex') }}</span>
            <span class="info-value">{{ glyph.hexValue }}</span>
          </div>
        </div>
        <div class="glyph-actions">
          <button @click="editGlyph(glyph)" class="btn-icon" :title="$t('glyph_manager.glyph.edit')">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button @click="removeGlyph(glyph.codePoint)" class="btn-icon" :title="$t('glyph_manager.glyph.delete')">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, watch, nextTick, onMounted } from 'vue';

const props = defineProps({
  glyphs: {
    type: Array,
    required: true
  },
  onGlyphChange: {
    type: Function,
    required: true
  },
  prefillData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['edit-in-grid', 'clear-prefill']);

const newGlyph = ref({ codePoint: '', hexValue: '' });
const searchQuery = ref('');
const editMode = ref(false);
const duplicateGlyph = ref(null);

const STORAGE_KEY = 'unicucumber_glyphs';

const loadStoredGlyphs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedGlyphs = JSON.parse(stored);
      props.onGlyphChange(parsedGlyphs);
    }
  } catch (error) {
    console.error('Error loading glyphs from storage:', error);
  }
};

const saveGlyphsToStorage = (glyphs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(glyphs));
  } catch (error) {
    console.error('Error saving glyphs to storage:', error);
  }
};

const isValidInput = computed(() => {
  const isValidCodePoint = /^[0-9A-Fa-f]{4,6}$/.test(newGlyph.value.codePoint);
  const hasValidHex = (props.prefillData && props.prefillData.hexValue) ||
    (/^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(newGlyph.value.hexValue));
  return isValidCodePoint && hasValidHex;
});

const getAddButtonTitle = computed(() => {
  if (!newGlyph.value.codePoint) return '请输入Unicode码点';
  if (!/^[0-9A-Fa-f]{4,6}$/.test(newGlyph.value.codePoint)) return '码点必须是4-6位十六进制数';
  if (!props.prefillData && !/^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(newGlyph.value.hexValue)) {
    return '请输入有效的字形数据 (32位或64位十六进制)';
  }
  return '添加字形';
});

const addGlyph = () => {
  if (!isValidInput.value) return;

  const hexValue = props.prefillData ? props.prefillData.hexValue : newGlyph.value.hexValue;
  const updatedGlyphs = [
    ...props.glyphs,
    {
      codePoint: newGlyph.value.codePoint,
      hexValue: hexValue
    }
  ];

  props.onGlyphChange(updatedGlyphs);
  saveGlyphsToStorage(updatedGlyphs);
  clearForm();
};

const findExistingGlyph = (codePoint) => {
  return props.glyphs.find(g => g.codePoint.toLowerCase() === codePoint.toLowerCase());
};

const handleAdd = () => {
  if (!isValidInput.value) return;

  const existing = findExistingGlyph(newGlyph.value.codePoint);
  if (existing && !editMode.value) {
    duplicateGlyph.value = existing;
    return;
  }

  addGlyph();
};

const updateExistingGlyph = () => {
  const hexValue = props.prefillData ? props.prefillData.hexValue : newGlyph.value.hexValue;
  const updatedGlyphs = props.glyphs.map(g =>
    g.codePoint.toLowerCase() === newGlyph.value.codePoint.toLowerCase()
      ? { ...g, hexValue }
      : g
  );

  props.onGlyphChange(updatedGlyphs);
  saveGlyphsToStorage(updatedGlyphs);
  clearForm();
};

const cancelAdd = () => {
  duplicateGlyph.value = null;
  clearForm();
};

const clearForm = () => {
  newGlyph.value = { codePoint: '', hexValue: '' };
  duplicateGlyph.value = null;
  editMode.value = false;

  emit('clear-prefill');
};

watch(() => props.prefillData, (newData) => {
  if (newData) {
    nextTick(() => {
      const codePointInput = document.querySelector('.add-glyph input');
      if (codePointInput) {
        codePointInput.focus();
      }
    });
  }
}, { immediate: true });

const filteredGlyphs = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return props.glyphs.filter(glyph =>
    glyph.codePoint.toLowerCase().includes(query) ||
    glyph.hexValue.toLowerCase().includes(query)
  );
});

const removeGlyph = (codePoint) => {
  const updatedGlyphs = props.glyphs.filter(glyph => glyph.codePoint !== codePoint);
  props.onGlyphChange(updatedGlyphs);
  saveGlyphsToStorage(updatedGlyphs);
};

const editGlyph = (glyph) => {
  newGlyph.value = { ...glyph };
  editMode.value = true;
  removeGlyph(glyph.codePoint);
};

const handleEditInGrid = (glyph) => {
  console.log('Editing glyph:', {
    codePoint: glyph.codePoint,
    hexValue: glyph.hexValue
  });
  emit('edit-in-grid', glyph.hexValue);
};

const exportToHex = () => {
  const hexContent = props.glyphs
    .map(glyph => `${glyph.codePoint}:${glyph.hexValue}`)
    .join('\n');

  const blob = new Blob([hexContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'glyphs.hex';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

onMounted(() => {
  loadStoredGlyphs();
});
</script>

<style scoped>
.glyph-manager {
  font-family: 'Noto Sans', sans-serif;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: bold;
}

.search-box {
  position: relative;
}

.search-input {
  font-family: 'Fira Code', monospace;
  width: 90%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
}

.add-glyph {
  border: 2px solid var(--primary-color);
  padding: 16px;
  border-radius: 8px;
  background: var(--background-light);
}

.input {
  font-family: 'Fira Code', monospace;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-add {
  padding: 8px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-add:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.glyph-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.glyph-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.glyph-preview {
  flex: 0 0 40px;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-light);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.glyph-preview:hover {
  background: var(--background-active);
  transform: scale(1.05);
}

.glyph-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-weight: 600;
}

.info-value {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glyph-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--background-active);
  color: var(--text-color);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.input[readonly] {
  background-color: var(--background-hover);
  cursor: not-allowed;
}

.hex-preview {
  background: var(--background-hover);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
  font-family: monospace;
}

.hex-label {
  color: var(--text-secondary);
  font-weight: 500;
  margin-right: 8px;
}

.hex-value {
  word-break: break-all;
  color: var(--text-color);
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-clear {
  padding: 8px 20px;
  background: var(--danger-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-clear:hover {
  background: var(--danger-hover);
}

.add-glyph h3 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: var(--text-secondary)
}

.duplicate-warning {
  background-color: var(--warning-background);
  border: 1px solid var(--warning-border);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.duplicate-warning p {
  color: var(--warning-text);
  margin: 0 0 12px 0;
  font-weight: 500;
}

.warning-actions {
  display: flex;
  gap: 8px;
}

.btn-warn {
  padding: 8px 16px;
  background: var(--warning-color);
  color: black;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-warn:hover {
  background: var(--warning-hover);
}

.btn-cancel {
  padding: 8px 16px;
  background: var(--grey-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background: var(--grey-hover);
}

.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-export:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  background: var(--primary-dark);
}
</style>

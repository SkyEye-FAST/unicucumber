<template>
  <div class="glyph-manager">
    <h2 class="title">字形管理器</h2>

    <div class="search-box">
      <input v-model="searchQuery" placeholder="搜索字形..." class="search-input" />
    </div>

    <div class="add-glyph">
      <input v-model="newGlyph.codePoint" placeholder="Unicode码点" class="input" />
      <input v-model="newGlyph.hexValue" placeholder="十六进制值" class="input" />
      <button @click="addGlyph" class="btn-add" :disabled="!isValidInput">
        {{ editMode ? '更新' : '添加' }}
      </button>
    </div>

    <div class="glyph-list">
      <div v-for="glyph in filteredGlyphs" :key="glyph.codePoint" class="glyph-card">
        <div
          class="glyph-preview"
          @click="handleEditInGrid(glyph)"
          :title="'点击编辑字形: ' + glyph.codePoint"
        >
          {{ String.fromCodePoint(parseInt(glyph.codePoint, 16)) }}
        </div>
        <div class="glyph-info">
          <div class="info-row">
            <span class="info-label">码点:</span>
            <span class="info-value">{{ glyph.codePoint }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Hex:</span>
            <span class="info-value">{{ glyph.hexValue }}</span>
          </div>
        </div>
        <div class="glyph-actions">
          <button @click="editGlyph(glyph)" class="btn-icon" title="编辑">
            <span>✏️</span>
          </button>
          <button @click="removeGlyph(glyph.codePoint)" class="btn-icon" title="删除">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue';

const props = defineProps({
  glyphs: {
    type: Array,
    required: true
  },
  onGlyphChange: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['edit-in-grid']);

const newGlyph = ref({ codePoint: '', hexValue: '' });
const searchQuery = ref('');
const editMode = ref(false);

const filteredGlyphs = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return props.glyphs.filter(glyph =>
    glyph.codePoint.toLowerCase().includes(query) ||
    glyph.hexValue.toLowerCase().includes(query)
  );
});

const isValidInput = computed(() => {
  return newGlyph.value.codePoint && newGlyph.value.hexValue &&
    /^[0-9A-Fa-f]+$/.test(newGlyph.value.codePoint) &&
    /^[0-9A-Fa-f]+$/.test(newGlyph.value.hexValue);
});

const addGlyph = () => {
  if (!isValidInput.value) return;
  props.onGlyphChange([...props.glyphs, { ...newGlyph.value }]);
  newGlyph.value = { codePoint: '', hexValue: '' };
  editMode.value = false;
};

const removeGlyph = (codePoint) => {
  props.onGlyphChange(props.glyphs.filter(glyph => glyph.codePoint !== codePoint));
};

const editGlyph = (glyph) => {
  newGlyph.value = { ...glyph };
  editMode.value = true;
  removeGlyph(glyph.codePoint);
};

const handleEditInGrid = (glyph) => {
  // 保持原始十六进制值，不需要特殊处理长度
  console.log('Editing glyph:', {
    codePoint: glyph.codePoint,
    hexValue: glyph.hexValue
  });
  emit('edit-in-grid', glyph.hexValue);
};
</script>

<style scoped>
.glyph-manager {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.add-glyph {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-add {
  padding: 8px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-add:disabled {
  background: #ccc;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.glyph-preview {
  flex: 0 0 40px;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.glyph-preview:hover {
  background: #e9ecef;
  transform: scale(1.05);
}

.glyph-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
  color: #666;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex: 0 0 auto;
  color: #666;
  font-weight: 500;
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
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: #e9ecef;
}

.btn-icon:hover {
  background: #f5f7fa;
}
</style>

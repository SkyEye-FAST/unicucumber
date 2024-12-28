<template>
  <div class="glyph-manager">
    <h2 class="title">字形管理器</h2>

    <div class="search-box">
      <input v-model="searchQuery" placeholder="搜索字形..." class="search-input" />
    </div>

    <div class="add-glyph">
      <div v-if="duplicateGlyph" class="duplicate-warning">
        <p>码点 {{ newGlyph.codePoint }} 已存在！</p>
        <div class="warning-actions">
          <button class="btn-warn" @click="updateExistingGlyph">
            更新现有字形
          </button>
          <button class="btn-cancel" @click="cancelAdd">
            取消
          </button>
        </div>
      </div>

      <template v-else>
        <div class="input-group">
          <label>Unicode码点 (4-6位十六进制):</label>
          <input
            v-model="newGlyph.codePoint"
            placeholder="输入Unicode码点 (例如: 4E00)"
            class="input"
            @input="$event.target.value = $event.target.value.toUpperCase()"
          />
          <input
            v-if="!prefillData"
            v-model="newGlyph.hexValue"
            placeholder="输入字形数据 (32位或64位十六进制)"
            class="input"
            @input="$event.target.value = $event.target.value.toUpperCase()"
          />
          <div v-else class="hex-preview">
            <span class="hex-label">字形数据:</span>
            <span class="hex-value">{{ prefillData.hexValue }}</span>
          </div>
        </div>
        <div class="button-group">
          <button @click="handleAdd" class="btn-add" :disabled="!isValidInput" :title="getAddButtonTitle">
            {{ editMode ? '更新字形' : '添加字形' }}
          </button>
          <button v-if="!editMode && (newGlyph.hexValue || prefillData)" @click="clearForm" class="btn-clear">
            清除
          </button>
        </div>
      </template>
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
import { ref, computed, defineProps, watch, nextTick } from 'vue';

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

// 修改 emit 声明，增加 clear-prefill 事件
const emit = defineEmits(['edit-in-grid', 'clear-prefill']);

const newGlyph = ref({ codePoint: '', hexValue: '' });
const searchQuery = ref('');
const editMode = ref(false);
const duplicateGlyph = ref(null);

// 修改验证逻辑
const isValidInput = computed(() => {
  const isValidCodePoint = /^[0-9A-Fa-f]{4,6}$/.test(newGlyph.value.codePoint);
  const hasValidHex = (props.prefillData && props.prefillData.hexValue) ||
    (/^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(newGlyph.value.hexValue));
  return isValidCodePoint && hasValidHex;
});

// 更新添加按钮提示信息
const getAddButtonTitle = computed(() => {
  if (!newGlyph.value.codePoint) return '请输入Unicode码点';
  if (!/^[0-9A-Fa-f]{4,6}$/.test(newGlyph.value.codePoint)) return '码点必须是4-6位十六进制数';
  if (!props.prefillData && !/^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(newGlyph.value.hexValue)) {
    return '请输入有效的字形数据 (32位或64位十六进制)';
  }
  return '添加字形';
});

// 更新添加字形逻辑
const addGlyph = () => {
  if (!isValidInput.value) return;

  const hexValue = props.prefillData ? props.prefillData.hexValue : newGlyph.value.hexValue;

  props.onGlyphChange([
    ...props.glyphs,
    {
      codePoint: newGlyph.value.codePoint,
      hexValue: hexValue
    }
  ]);

  clearForm();
};

// 添加检查重复的方法
const findExistingGlyph = (codePoint) => {
  return props.glyphs.find(g => g.codePoint.toLowerCase() === codePoint.toLowerCase());
};

// 修改添加方法
const handleAdd = () => {
  if (!isValidInput.value) return;

  const existing = findExistingGlyph(newGlyph.value.codePoint);
  if (existing && !editMode.value) {
    duplicateGlyph.value = existing;
    return;
  }

  addGlyph();
};

// 更新现有字形
const updateExistingGlyph = () => {
  const hexValue = props.prefillData ? props.prefillData.hexValue : newGlyph.value.hexValue;
  const updatedGlyphs = props.glyphs.map(g =>
    g.codePoint.toLowerCase() === newGlyph.value.codePoint.toLowerCase()
      ? { ...g, hexValue }
      : g
  );

  props.onGlyphChange(updatedGlyphs);
  clearForm();
};

// 取消添加
const cancelAdd = () => {
  duplicateGlyph.value = null;
  clearForm();
};

// 修改清除表单方法
const clearForm = () => {
  newGlyph.value = { codePoint: '', hexValue: '' };
  duplicateGlyph.value = null;
  editMode.value = false;
  // 发送清除预填充数据的事件
  emit('clear-prefill');
};

// 监听预填充数据，但不清除已有输入
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
  border: 2px solid #4CAF50;
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
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

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.9rem;
  color: #666;
}

.input[readonly] {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.hex-preview {
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
  font-family: monospace;
}

.hex-label {
  color: #666;
  font-weight: 500;
  margin-right: 8px;
}

.hex-value {
  word-break: break-all;
  color: #2c3e50;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-clear {
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-clear:hover {
  background: #d32f2f;
}

.add-glyph h3 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: #666;
}

.duplicate-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.duplicate-warning p {
  color: #856404;
  margin: 0 0 12px 0;
  font-weight: 500;
}

.warning-actions {
  display: flex;
  gap: 8px;
}

.btn-warn {
  padding: 8px 16px;
  background: #ffc107;
  color: #000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-warn:hover {
  background: #e0a800;
}

.btn-cancel {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background: #5a6268;
}
</style>

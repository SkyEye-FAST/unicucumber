<template>
  <UniCucumber :hex-value="''" :width="16" />
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n'
import UniCucumber from './components/GlyphEditor.vue'

export default {
  components: {
    UniCucumber,
  },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    return { t }
  },
}
</script>

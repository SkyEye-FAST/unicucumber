<template>
  <UniCucumber :hex-value="''" :width="16" />
  <NotificationCenter />
  <PwaStatus />
  <AppTooltip />
</template>

<script setup lang="ts">
import UniCucumber from './components/GlyphEditor.vue'
import NotificationCenter from './components/NotificationCenter.vue'
import PwaStatus from './components/PwaStatus.vue'
import AppTooltip from './components/AppTooltip.vue'
</script>

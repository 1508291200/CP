<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <!-- 两位人物并排 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <CharacterCard
        v-for="char in characters"
        :key="char.id"
        :character="char"
        @edit="openEditChar(char)"
        @deleted="removeChar"
      />

      <!-- 新建人物按钮（最多两人） -->
      <div
        v-if="can('cp:create') && characters.length < 2"
        class="border-2 border-dashed border-[var(--color-border-input)] rounded-[var(--radius-card)] flex flex-col items-center justify-center gap-3 min-h-[200px] cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] transition-colors group"
        @click="openCreateChar"
      >
        <span class="text-3xl group-hover:scale-110 transition-transform">+</span>
        <span class="text-sm text-[var(--color-text-secondary)]">添加人物</span>
      </div>
    </div>

    <!-- 关系概述 -->
    <RelationOverview :cp="cp" />

    <!-- 人物表单弹窗 -->
    <CharacterFormModal
      v-if="showCharModal"
      v-model:visible="showCharModal"
      :cp-id="cpId"
      :character="editingChar"
      @saved="onCharSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCharacterStore } from '@/stores/character'
import { usePermission } from '@/composables/usePermission'
import CharacterCard from '@/components/profile/CharacterCard.vue'
import CharacterFormModal from '@/components/profile/CharacterFormModal.vue'
import RelationOverview from '@/components/profile/RelationOverview.vue'
import type { CpItem, Character } from '@/types'

const props = defineProps<{ cp?: CpItem | null; cpId: string }>()

const charStore = useCharacterStore()
const { can } = usePermission()

const characters   = computed(() => charStore.list)
const showCharModal = ref(false)
const editingChar   = ref<Character | null>(null)

function openCreateChar() {
  editingChar.value = null
  showCharModal.value = true
}

function openEditChar(char: Character) {
  editingChar.value = char
  showCharModal.value = true
}

function removeChar(_id: string) {
  // store already updated by CharacterCard
}

function onCharSaved() {
  showCharModal.value = false
  charStore.fetchList(props.cpId)
}

onMounted(() => {
  charStore.fetchList(props.cpId)
})
</script>

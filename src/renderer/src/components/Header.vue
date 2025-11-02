<template>
  <div
    class="fixed top-0 right-0 left-0 h-10 flex items-center gap-1 z-50 drag bg-white/80 backdrop-blur-sm border-t border-x border-gray-300"
  >
    <div class="flex-1 w-full h-full"></div>

    <div class="flex items-center gap-1 px-2 no-drag">
      <button
        @click="handleMinimize"
        class="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-gray-100 active:bg-gray-200"
        title="最小化"
      >
        <Minimize />
      </button>

      <button
        @click="handleToggleMaximize"
        class="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-gray-100 active:bg-gray-200"
        :title="isMaximized ? '还原' : '最大化'"
      >
        <Maximize v-if="!isMaximized" />
        <RestoreDown v-else />
      </button>

      <button
        @click="handleClose"
        class="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-red-500 hover:text-white active:bg-red-600"
        title="关闭"
      >
        <XMarkClose />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useIPC } from "@/composables/useIPC";
import Minimize from "@/icons/Minimize.vue";
import Maximize from "@/icons/Maximize.vue";
import RestoreDown from "@/icons/RestoreDown.vue";
import XMarkClose from "@/icons/XMarkClose.vue";

const ipc = useIPC();
const isMaximized = ref(false);

// 获取窗口状态
async function updateWindowState() {
  const result = await ipc.invoke("ui:window-state");
  if (result.success && result.data) {
    isMaximized.value = result.data.isMaximized ?? false;
  }
}

// 最小化窗口
async function handleMinimize() {
  const result = await ipc.invoke("ui:window-minimize");
  if (!result.success) {
    console.error("最小化失败:", result.error);
  }
}

// 切换最大化/还原
async function handleToggleMaximize() {
  const result = await ipc.invoke("ui:window-toggle-maximize");
  if (result.success) {
    // 更新状态
    await updateWindowState();
  } else {
    console.error("切换最大化失败:", result.error);
  }
}

// 关闭窗口
async function handleClose() {
  const result = await ipc.invoke("ui:window-close");
  if (!result.success) {
    console.error("关闭窗口失败:", result.error);
  }
}

// 初始化时获取窗口状态
onMounted(() => {
  updateWindowState();
});
</script>

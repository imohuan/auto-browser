<template>
  <DraggableArea
    class="h-10 flex items-center gap-1 z-50 bg-white/80 backdrop-blur-sm border-t border-x border-gray-300"
    @dblclick="handleToggleMaximize"
  >
    <div class="flex-1 min-w-0 h-full">
      <slot></slot>
    </div>

    <div class="flex items-center gap-1 px-2 shrink-0">
      <!-- 模式切换按钮组 -->
      <div class="flex items-center gap-0.5 bg-gray-100 rounded p-0.5 mr-1">
        <button
          @click="switchToMode('browser')"
          :class="[
            'px-2 h-6 flex items-center justify-center rounded text-xs transition-all',
            currentMode === 'browser'
              ? 'bg-white shadow-sm text-gray-900 font-medium'
              : 'text-gray-600 hover:text-gray-900',
          ]"
          title="浏览器模式"
        >
          浏览器
        </button>
        <button
          @click="switchToMode('grid')"
          :class="[
            'px-2 h-6 flex items-center justify-center rounded text-xs transition-all',
            currentMode === 'grid'
              ? 'bg-white shadow-sm text-gray-900 font-medium'
              : 'text-gray-600 hover:text-gray-900',
          ]"
          title="网格模式"
        >
          网格
        </button>
      </div>

      <button
        @click="handleToggleAlwaysOnTop"
        class="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-gray-100 active:bg-gray-200"
        :class="{ 'bg-gray-200': isAlwaysOnTop }"
        :title="isAlwaysOnTop ? '取消顶置' : '窗口顶置'"
      >
        <Pin :class="isAlwaysOnTop ? '' : ' rotate-45'" />
      </button>

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
        class="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-gray-100 active:bg-gray-200"
        title="关闭"
      >
        <XMarkClose />
      </button>
    </div>
  </DraggableArea>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useIPC } from "@/composables/useIPC";
import DraggableArea from "@/components/DraggableArea.vue";
import Minimize from "@/icons/Minimize.vue";
import Maximize from "@/icons/Maximize.vue";
import RestoreDown from "@/icons/RestoreDown.vue";
import XMarkClose from "@/icons/XMarkClose.vue";
import Pin from "@/icons/Pin.vue";

const router = useRouter();
const route = useRoute();
const ipc = useIPC();
const isMaximized = ref(false);
const isAlwaysOnTop = ref(false);

// 当前模式
const currentMode = computed(() => {
  if (route.path === "/" || route.name === "Browser") {
    return "browser";
  } else if (route.path === "/grid" || route.name === "Grid") {
    return "grid";
  }
  return "browser";
});

// 获取窗口状态
async function updateWindowState() {
  const result = await ipc.invoke("ui:window-state");
  console.log(result);

  if (result.success && result.data && result.data.data) {
    isMaximized.value = result.data.data.isMaximized ?? false;
    isAlwaysOnTop.value = result.data.data.isAlwaysOnTop ?? false;
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
  // const result = await ipc.invoke("ui:window-toggle-maximize");
  //   if (result.success) {
  //     // 更新状态
  //     await updateWindowState();
  //   } else {
  //     console.error("切换最大化失败:", result.error);
  //   }
}

// 关闭窗口
async function handleClose() {
  const result = await ipc.invoke("ui:window-close");
  if (!result.success) {
    console.error("关闭窗口失败:", result.error);
  }
}

// 切换窗口顶置
async function handleToggleAlwaysOnTop() {
  const result = await ipc.invoke("ui:window-toggle-always-on-top");
  if (result.success) {
    // 更新状态
    await updateWindowState();
  } else {
    console.error("切换窗口顶置失败:", result.error);
  }
}

// 切换模式
function switchToMode(mode: "browser" | "grid") {
  if (mode === "browser") {
    router.push("/");
  } else if (mode === "grid") {
    router.push("/grid");
  }
}

// 初始化时获取窗口状态
onMounted(() => {
  updateWindowState();
});
</script>

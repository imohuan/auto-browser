<template>
  <div
    ref="draggableElement"
    class="draggable-area"
    @mousedown="handleMouseDown"
    @dblclick="(event) => $emit('dblclick', event)"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useIPC } from "@/composables/useIPC";

interface Props {
  /**
   * 点击阈值（毫秒）
   * @default 100
   */
  clickThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
  clickThreshold: 100,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
  dblclick: [event: MouseEvent];
}>();

const ipc = useIPC();

// 响应式数据
const draggableElement = ref<HTMLElement>();

// --- 拖拽状态变量 ---
// 在 mousedown 时捕获窗口和鼠标的初始位置
let initialWindowPos = { x: 0, y: 0 };
let initialMousePos = { x: 0, y: 0 };

let moveIng = false;
let startTime = 0;

// --- 移动窗口函数 ---
const move = (event: MouseEvent) => {
  if (!moveIng) return;

  // 1. 计算从拖拽开始时，鼠标在屏幕上移动的总距离
  const deltaX = event.screenX - initialMousePos.x;
  const deltaY = event.screenY - initialMousePos.y;

  // 2. 计算窗口的全新绝对位置
  const newX = initialWindowPos.x + deltaX;
  const newY = initialWindowPos.y + deltaY;

  // 3. 将计算出的新位置发送给主进程
  ipc.invoke("ui:window-move", {
    x: Math.round(newX),
    y: Math.round(newY),
  });
};

// --- 鼠标按下事件 ---
const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return;

  const target = event.target as HTMLElement;
  // 排除输入类元素和按钮
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "BUTTON" ||
    target.closest("button") ||
    target.closest("input") ||
    target.closest("textarea") ||
    target.closest("[contenteditable]")
  ) {
    return;
  }

  moveIng = true;
  startTime = Date.now();

  // 在 mousedown 时记录窗口和鼠标的初始位置
  initialWindowPos = {
    x: window.screenX,
    y: window.screenY,
  };
  initialMousePos = { x: event.screenX, y: event.screenY };

  event.preventDefault();
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", handleMouseUp);
};

// 鼠标松开事件
const handleMouseUp = (event: MouseEvent) => {
  if (!moveIng) return;
  const endTime = Date.now();
  const duration = endTime - startTime;
  if (duration < props.clickThreshold) emit("click", event);

  document.removeEventListener("mousemove", move);
  document.removeEventListener("mouseup", handleMouseUp);
  moveIng = false;
};
</script>

<style scoped>
.draggable-area {
  cursor: default;
  user-select: none;
}
</style>

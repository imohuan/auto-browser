// src/renderer/src/stores/grid.ts
// Grid 布局状态管理

import { ref } from "vue";
import { defineStore } from "pinia";
import type { LayoutItem } from "grid-layout-plus";

/** 工具栏高度（px） */
export const TOOLBAR_HEIGHT = 60;

/** Grid配置 */
export interface GridConfig {
  colNum: number;
  rowHeight: number;
  margin: [number, number];
}

export const useGridStore = defineStore("grid", () => {
  // Grid配置
  const colNum = ref(12);
  const rowHeight = ref(60);
  const margin = ref<[number, number]>([10, 10]);

  // 拖拽状态（用于控制WebContentsView显示/隐藏）
  const isDragging = ref(false);
  const isResizing = ref(false);

  // 进入网格模式时需要自动滚动到的视图ID
  const pendingScrollViewId = ref<string | null>(null);

  /**
   * 将Grid坐标转换为窗口绝对坐标
   * @param item Grid项
   * @param containerWidth Grid容器宽度（可选，默认使用window.innerWidth）
   * @returns 窗口绝对坐标
   */
  function gridToWindow(item: LayoutItem, containerWidth?: number) {
    // Grid容器宽度（减去padding）
    const gridWidth = containerWidth || window.innerWidth - 20; // 减去padding

    // 计算每列的宽度
    const colWidth = gridWidth / colNum.value;

    // 计算坐标（考虑margin）
    const x = item.x * colWidth + margin.value[0];
    const y = item.y * rowHeight.value + margin.value[1] + TOOLBAR_HEIGHT;
    const width = item.w * colWidth - margin.value[0] * 2;
    const height = item.h * rowHeight.value - margin.value[1] * 2;

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * 获取Grid配置
   */
  function getConfig(): GridConfig {
    return {
      colNum: colNum.value,
      rowHeight: rowHeight.value,
      margin: margin.value,
    };
  }

  /**
   * 设置拖拽状态
   */
  function setDragging(value: boolean) {
    isDragging.value = value;
  }

  /**
   * 设置调整大小状态
   */
  function setResizing(value: boolean) {
    isResizing.value = value;
  }

  /**
   * 设置需要滚动到的视图ID
   */
  function setPendingScrollViewId(id: string | null) {
    pendingScrollViewId.value = id;
  }

  return {
    // 状态
    colNum,
    rowHeight,
    margin,
    isDragging,
    isResizing,
    pendingScrollViewId,
    // 方法
    gridToWindow,
    getConfig,
    setDragging,
    setResizing,
    setPendingScrollViewId,
  };
});

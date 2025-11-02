// src/renderer/src/stores/views.ts
// 视图管理 Store

import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { LayoutItem } from "grid-layout-plus";

export interface ViewItem extends LayoutItem {
  /** 视图 ID（对应 i） */
  id: string;
  /** 标题 */
  title: string;
  /** URL */
  url: string;
  /** 是否选中（聚焦） */
  selected: boolean;
  /** WebContentsView 是否可见 */
  visible: boolean;
  /** 对应主进程中的视图 ID（未创建时为 null） */
  backendId: string | null;
  /** 缩略图 */
  thumbnail?: string;
  /** 是否正在加载 */
  loading?: boolean;
}

export const useViewsStore = defineStore("views", () => {
  // 视图列表
  const views = ref<ViewItem[]>([]);

  // 选中的视图 ID
  const selectedViewId = ref<string | null>(null);

  // 计算属性：选中的视图
  const selectedView = computed(() => {
    return views.value.find((v) => v.id === selectedViewId.value);
  });

  // 计算属性：视图数量
  const viewCount = computed(() => views.value.length);

  /**
   * 添加视图
   */
  function addView(view: Omit<ViewItem, "selected">) {
    views.value.push({
      ...view,
      i: view.id, // Grid需要i作为唯一标识
      selected: false,
      visible: view.visible ?? false, // 默认不显示WebContentsView
      backendId: view.backendId ?? null,
    });
  }

  /**
   * 移除视图
   */
  function removeView(id: string) {
    const index = views.value.findIndex((v) => v.id === id);
    if (index !== -1) {
      views.value.splice(index, 1);
      if (selectedViewId.value === id) {
        selectedViewId.value = null;
      }
    }
  }

  /**
   * 更新视图
   */
  function updateView(id: string, updates: Partial<ViewItem>) {
    const view = views.value.find((v) => v.id === id);
    if (view) {
      Object.assign(view, updates);
      if (updates.id && updates.id !== view.id) {
        view.id = updates.id;
        view.i = updates.id;
      }
    }
  }

  function setBackendId(id: string, backendId: string | null) {
    const view = views.value.find((v) => v.id === id);
    if (view) {
      view.backendId = backendId;
    }
  }

  function setVisibility(id: string, visible: boolean) {
    const view = views.value.find((v) => v.id === id);
    if (view) {
      view.visible = visible;
    }
  }

  /**
   * 选中视图（聚焦）
   * 注意：此函数只更新前端状态，不调用后端API
   * 后端API调用由GridView中的handleSelectView处理
   */
  function selectView(id: string | null) {
    views.value.forEach((v) => {
      v.selected = v.id === id;
    });
    selectedViewId.value = id;
  }

  /**
   * 更新Grid布局
   */
  function updateLayout(id: string, layout: Partial<LayoutItem>) {
    const view = views.value.find((v) => v.id === id);
    if (view) {
      Object.assign(view, layout);
    }
  }

  /**
   * 清空所有视图
   */
  function clearViews() {
    views.value = [];
    selectedViewId.value = null;
  }

  return {
    // 状态
    views,
    selectedViewId,
    // 计算属性
    selectedView,
    viewCount,
    // 方法
    addView,
    removeView,
    updateView,
    selectView,
    updateLayout,
    clearViews,
    setBackendId,
    setVisibility,
  };
});

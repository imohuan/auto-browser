<template>
  <div class="w-full h-full flex flex-col font-sans border border-gray-300">
    <Header>
      <div class="flex gap-2 items-center h-full p-2 z-100">
        <button
          class="w-10 h-full rounded-md cursor-pointer flex items-center justify-center transition-all z-[1000] hover:scale-105 no-drag border border-gray-200/50"
          @click="handleAddView"
          title="添加新视图"
        >
          <PlusCircle />
        </button>

        <div
          class="flex items-center gap-2 text-gray-900/85 text-xs font-mono z-[1500] px-2"
        >
          <span>容器数量: {{ viewsStore.viewCount }}</span>
          <span>已显示: {{ visibleCount }}</span>
          <span v-if="gridStore.isDragging">拖拽中...</span>
          <span v-else-if="gridStore.isResizing">调整大小中...</span>
        </div>
      </div>
    </Header>

    <div ref="gridWrapperRef" class="flex-1 overflow-auto pt-2 p-1">
      <GridLayout
        ref="gridLayoutRef"
        v-model:layout="viewsStore.views"
        :col-num="gridStore.colNum"
        :row-height="gridStore.rowHeight"
        :margin="gridStore.margin"
        :is-draggable="true"
        :is-resizable="true"
        :vertical-compact="true"
        :use-css-transforms="true"
        @layout-updated="handleLayoutUpdated"
        @layout-ready="handleLayoutReady"
      >
        <GridItem
          v-for="view in viewsStore.views"
          :key="view.id"
          :x="view.x"
          :y="view.y"
          :w="view.w"
          :h="view.h"
          :i="view.id"
          :min-w="2"
          :min-h="2"
          @move="handleMove"
          @resize="handleResize"
          @moved="handleMoved"
          @resized="handleResized"
        >
          <div
            :ref="(el) => setViewRef(view.id, el)"
            :class="[
              'w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden transition-shadow cursor-pointer',
              {
                'shadow-[0_0_0_3px_#667eea,0_4px_12px_rgba(102,126,234,0.3)]':
                  view.selected,
              },
            ]"
            @click="handleSelectView(view.id)"
          >
            <!-- 标题栏 -->
            <div
              class="h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-between px-3 select-none"
            >
              <div
                class="flex items-center gap-1 flex-1 min-w-0 text-sm font-medium"
              >
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click.stop="handleGoBack(view.id)"
                  title="后退"
                  :disabled="
                    !viewHistoryMap[view.id]?.canGoBack || !view.visible
                  "
                >
                  <ChevronLeft />
                </button>
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click.stop="handleGoForward(view.id)"
                  title="前进"
                  :disabled="
                    !viewHistoryMap[view.id]?.canGoForward || !view.visible
                  "
                >
                  <ChevronRight />
                </button>
                <img
                  v-if="view.favicon"
                  :src="view.favicon"
                  class="w-4 h-4 shrink-0 object-contain ml-1"
                  @error="handleFaviconError(view.id)"
                  alt="favicon"
                />
                <Globe v-else class="ml-1" />
                <span
                  class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                  >{{ view.title || "未命名" }}</span
                >
              </div>
              <div class="flex gap-1">
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click.stop="handleRefreshView(view.id)"
                  title="刷新"
                  :disabled="!view.visible"
                >
                  <ArrowPath />
                </button>
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click.stop="handleZoomView(view.id, -ZOOM_STEP)"
                  title="缩小"
                  :disabled="!view.visible"
                >
                  <Minus />
                </button>
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click.stop="handleZoomView(view.id, ZOOM_STEP)"
                  title="放大"
                  :disabled="!view.visible"
                >
                  <Plus />
                </button>
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click.stop="toggleViewVisibility(view.id)"
                  :title="view.visible ? '隐藏' : '显示'"
                >
                  <Eye v-if="!view.visible" />
                  <EyeSlash v-else />
                </button>
                <button
                  class="w-7 h-7 rounded bg-white/20 border-0 text-white cursor-pointer flex items-center justify-center transition-colors hover:bg-white/30"
                  @click.stop="handleRemoveView(view.id)"
                  title="删除"
                >
                  <XMark />
                </button>
              </div>
            </div>

            <!-- 内容区 -->
            <div
              class="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-4"
            >
              <!-- 加载失败状态 -->
              <div
                v-if="view.loadError"
                class="flex flex-col items-center justify-center text-center max-w-md"
              >
                <div
                  class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3"
                >
                  <svg
                    class="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h4 class="text-sm font-semibold text-red-900 mb-2">
                  加载失败
                </h4>
                <p class="text-xs text-red-700 mb-2">
                  {{ view.loadError.errorDescription }}
                </p>
                <p class="text-xs text-gray-500 break-all mb-3">
                  {{ view.loadError.validatedURL }}
                </p>
                <button
                  @click.stop="handleRefreshView(view.id)"
                  class="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                  :disabled="!view.visible"
                >
                  重新加载
                </button>
              </div>
              <!-- 加载中状态 -->
              <div
                v-else-if="view.loading"
                class="flex flex-col items-center gap-3"
              >
                <div
                  class="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"
                ></div>
                <p class="text-sm">加载中...</p>
              </div>
              <!-- 隐藏状态 -->
              <div
                v-else-if="!view.visible"
                class="flex flex-col items-center justify-center text-center text-gray-400"
              >
                <EyeSlash class="w-12 h-12 text-gray-400" />
                <p class="text-sm text-gray-500 mt-2">已隐藏</p>
                <p class="text-xs text-gray-400 mt-1">
                  点击标题栏的眼睛图标显示
                </p>
              </div>
              <!-- 正常状态 -->
              <div
                v-else
                class="text-center text-gray-400 flex flex-col items-center justify-center"
              >
                <Globe class="w-12 h-12 text-gray-400" />
                <p class="text-sm text-gray-500 mt-2">
                  {{ view.url || "about:blank" }}
                </p>
              </div>
            </div>
          </div>
        </GridItem>
      </GridLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  computed,
  type ComponentPublicInstance,
} from "vue";
import Header from "@/components/Header.vue";
import { GridLayout, GridItem } from "grid-layout-plus";
import { useGridStore } from "@/stores/grid";
import { useViewsStore, type ViewItem } from "@/stores/views";
import { useIPC } from "@/composables/useIPC";
import { debounce } from "lodash-es";
import ChevronLeft from "@/icons/ChevronLeft.vue";
import ChevronRight from "@/icons/ChevronRight.vue";
import Globe from "@/icons/Globe.vue";
import ArrowPath from "@/icons/ArrowPath.vue";
import Minus from "@/icons/Minus.vue";
import Plus from "@/icons/Plus.vue";
import EyeSlash from "@/icons/EyeSlash.vue";
import Eye from "@/icons/Eye.vue";
import XMark from "@/icons/XMark.vue";
import PlusCircle from "@/icons/PlusCircle.vue";

const gridStore = useGridStore();
const viewsStore = useViewsStore();
const ipc = useIPC();

const gridLayoutRef = ref<InstanceType<typeof GridLayout>>();
const gridWrapperRef = ref<HTMLElement | null>(null);
const viewElementMap = new Map<string, HTMLElement>();
const viewHistoryMap = ref<
  Record<string, { canGoBack: boolean; canGoForward: boolean }>
>({});
const browserAPI = (window as any)?.browserAPI;

const HEADER_HEIGHT = 48;
const CONTENT_PADDING = 12;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const SCROLL_RETRY_LIMIT = 5;
const SCROLL_RETRY_DELAY = 120;

const visibleCount = computed(
  () => viewsStore.views.filter((view) => view.visible).length
);

function setViewRef(id: string, el: Element | ComponentPublicInstance | null) {
  let element: HTMLElement | null = null;
  if (el) {
    if (el instanceof HTMLElement) {
      element = el;
    } else if ((el as ComponentPublicInstance).$el) {
      element = (el as ComponentPublicInstance).$el as HTMLElement | null;
    }
  }
  if (element) {
    viewElementMap.set(id, element);
  } else {
    viewElementMap.delete(id);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function scrollToViewElement(viewId: string): Promise<boolean> {
  const wrapper = gridWrapperRef.value;
  if (!wrapper) return false;

  await nextTick();
  const element = viewElementMap.get(viewId);
  if (!element) return false;

  const withinWrapper = wrapper.contains(element);

  try {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  } catch (error) {
    console.warn(`滚动到视图 ${viewId} 失败，使用回退方案:`, error);
    if (withinWrapper) {
      const rect = element.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const offset = rect.top - wrapperRect.top + wrapper.scrollTop - 40;
      wrapper.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    } else {
      element.scrollIntoView();
    }
  }

  return true;
}

async function scrollToViewWithRetry(
  viewId: string,
  attempt = 0
): Promise<boolean> {
  if (!viewId) return false;

  const success = await scrollToViewElement(viewId);
  if (success) {
    return true;
  }

  if (attempt >= SCROLL_RETRY_LIMIT) {
    return false;
  }

  await delay(SCROLL_RETRY_DELAY);
  return scrollToViewWithRetry(viewId, attempt + 1);
}

function handleLayoutReady() {
  syncViews();
}

function handleLayoutUpdated() {
  if (gridStore.isDragging || gridStore.isResizing) return;
  updateAllVisibleViewBounds();
}

function hideBackendView(view: ViewItem) {
  if (!view.backendId) return;
  ipc.updateViewBounds(view.backendId, {
    x: -10000,
    y: -10000,
    width: 100,
    height: 100,
  });
}

function handleMove(viewId: string) {
  gridStore.setDragging(true);
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (view && view.visible) {
    hideBackendView(view);
  }
}

function handleMoved(viewId: string, x: number, y: number) {
  gridStore.setDragging(false);
  viewsStore.updateLayout(viewId, { x, y });
  updateAllVisibleViewBounds();
}

function handleResize(viewId: string) {
  gridStore.setResizing(true);
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (view && view.visible) {
    hideBackendView(view);
  }
}

function handleResized(viewId: string, h: number, w: number) {
  gridStore.setResizing(false);
  viewsStore.updateLayout(viewId, { h, w });
  updateAllVisibleViewBounds();
}

async function ensureBackend(view: ViewItem | undefined) {
  if (!view) return null;
  if (view.backendId) return view.backendId;

  // 创建视图时设置为隐藏状态（false），后续由 GridView 控制显示/隐藏
  const createResult = await ipc.createView({
    title: view.title,
    url: view.url,
    bounds: { x: 0, y: 0, width: 800, height: 600 },
    visible: false,
  });
  if (!createResult.success || !createResult.data) {
    console.error("创建 WebContentsView 失败:", createResult.error);
    return null;
  }
  const backendId = createResult.data.viewId;
  viewsStore.setBackendId(view.id, backendId);
  return backendId;
}

async function toggleViewVisibility(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view) return;

  const shouldShow = !view.visible;
  viewsStore.setVisibility(viewId, shouldShow);

  if (shouldShow) {
    const backendId = await ensureBackend(view);
    if (!backendId) {
      viewsStore.setVisibility(viewId, false);
      return;
    }

    await nextTick();

    // 先计算并设置 bounds，再显示视图
    updateViewBoundsImmediate(viewId);
    await nextTick();

    // 使用 setViewVisible 显示视图（支持多视图同时显示）
    await ipc.setViewVisible(backendId, true);
    updateViewHistory(viewId);
  } else {
    if (view.backendId) {
      // 使用 setViewVisible 隐藏视图
      await ipc.setViewVisible(view.backendId, false);
    }
    if (viewsStore.selectedViewId === viewId) {
      viewsStore.selectView(null);
    }
    updateAllVisibleViewBounds();
  }
}

async function handleSelectView(viewId: string) {
  if (gridStore.isDragging || gridStore.isResizing) return;

  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view || !view.visible) return;

  const backendId = await ensureBackend(view);
  if (!backendId) return;

  viewsStore.selectView(viewId);
  // 使用 setActive 置顶视图（但不隐藏其他视图）
  await ipc.invoke("views:setActive", backendId);
  updateViewBounds(viewId);
  updateViewHistory(viewId);
}

function _updateViewBounds(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view || !view.visible || !view.backendId) return;

  const element = viewElementMap.get(view.id);
  if (!element) return;

  // TODO: 计算ViewBounds
  const rect = element.getBoundingClientRect();
  const offsetY = 10;
  const x = rect.left + CONTENT_PADDING;
  // y 向上移动 8px，使 WebContentsView 更贴近标题栏
  const y = rect.top + HEADER_HEIGHT + CONTENT_PADDING - offsetY;
  const width = rect.width - CONTENT_PADDING * 2;
  const height = rect.height - HEADER_HEIGHT - CONTENT_PADDING * 2 + offsetY;

  ipc.updateViewBounds(view.backendId, {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(0, Math.round(width)),
    height: Math.max(0, Math.round(height)),
  });
}

/** 立即更新视图边界（不使用防抖） */
function updateViewBoundsImmediate(viewId: string) {
  _updateViewBounds(viewId);
}

/** 因为grid变形之后需要一些时间让节点稳定 */
function updateViewBounds(viewId: string) {
  debounce(_updateViewBounds, 500)(viewId);
}

function updateAllVisibleViewBounds() {
  viewsStore.views.forEach((view) => {
    if (view.visible) {
      updateViewBounds(view.id);
    }
  });
}

async function handleAddView() {
  const count = viewsStore.viewCount;
  const newViewId = `view_${Date.now()}`;

  // 每个视图占4列（w: 4），每行可以放 12/4 = 3 个
  const viewsPerRow = Math.floor(gridStore.colNum / 4); // 每行3个视图
  const viewWidth = 4; // 每个视图占4列
  const viewHeight = 4; // 每个视图占4行

  // 按顺序排列：第0个在(0,0)，第1个在(4,0)，第2个在(8,0)，第3个在(0,4)...
  const x = (count % viewsPerRow) * viewWidth;
  const y = Math.floor(count / viewsPerRow) * viewHeight;

  // 添加到 Grid
  viewsStore.addView({
    id: newViewId,
    i: newViewId,
    title: `容器 ${count + 1}`,
    url: "https://www.baidu.com",
    x,
    y,
    w: viewWidth,
    h: viewHeight,
    visible: false,
    backendId: null,
  });

  // 立即创建专属的 WebContentsView
  const view = viewsStore.views.find((v) => v.id === newViewId);
  if (view) {
    const backendId = await ensureBackend(view);
    if (backendId) {
      // 创建成功，现在显示视图
      viewsStore.setVisibility(newViewId, true);
      await nextTick();

      // 先计算并设置 bounds，再显示视图
      updateViewBoundsImmediate(newViewId);
      await nextTick();

      await ipc.setViewVisible(backendId, true);
      updateViewHistory(newViewId);
    }
  }
}

async function handleRemoveView(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view) return;

  if (view.backendId) {
    await ipc.removeView(view.backendId);
  }
  viewsStore.removeView(viewId);
  updateAllVisibleViewBounds();
}

async function syncViews() {
  const result = await ipc.getAllViews();
  if (!result.success || !result.data) return;

  const backendViews = result.data.views;
  const backendViewIds = new Set(backendViews.map((v) => v.id));

  // 保存现有views的布局信息（通过backendId映射）
  const layoutMap = new Map<
    string,
    { x: number; y: number; w: number; h: number; visible: boolean }
  >();
  viewsStore.views.forEach((view) => {
    if (view.backendId) {
      layoutMap.set(view.backendId, {
        x: view.x,
        y: view.y,
        w: view.w,
        h: view.h,
        visible: view.visible,
      });
    }
  });

  // 移除后端已不存在的views
  const viewsToRemove: string[] = [];
  viewsStore.views.forEach((view) => {
    if (view.backendId && !backendViewIds.has(view.backendId)) {
      viewsToRemove.push(view.id);
    }
  });
  viewsToRemove.forEach((viewId) => {
    viewsStore.removeView(viewId);
  });

  // 更新或添加views
  backendViews.forEach((view, index) => {
    const containerId = view.id;
    const existingView = viewsStore.views.find(
      (v) => v.backendId === containerId
    );

    if (existingView) {
      // 已存在的view：保留布局信息，只更新其他属性
      viewsStore.updateView(existingView.id, {
        title: view.title,
        url: view.url,
        backendId: view.id,
      });
    } else {
      // 新view：使用保存的布局或计算默认位置
      const savedLayout = layoutMap.get(containerId);
      const viewsPerRow = Math.floor(gridStore.colNum / 4);
      const viewWidth = 4;
      const viewHeight = 4;

      viewsStore.addView({
        id: containerId,
        i: containerId,
        title: view.title,
        url: view.url,
        x: savedLayout?.x ?? (index % viewsPerRow) * viewWidth,
        y: savedLayout?.y ?? Math.floor(index / viewsPerRow) * viewHeight,
        w: savedLayout?.w ?? viewWidth,
        h: savedLayout?.h ?? viewHeight,
        visible: savedLayout?.visible ?? true,
        backendId: view.id,
      });
    }
  });

  await nextTick();
  updateAllVisibleViewBounds();
}

async function handleRefreshView(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view?.backendId) return;
  // 清除之前的错误状态
  viewsStore.updateView(viewId, {
    loadError: undefined,
    loading: true,
  });
  await ipc.reloadView(view.backendId);
  updateViewHistory(viewId);
}

async function handleZoomView(viewId: string, delta: number) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view) return;

  const backendId = await ensureBackend(view);
  if (!backendId) return;

  const zoomInfo = await ipc.invoke<{ zoomFactor: number }>(
    "browser:getZoom",
    backendId
  );
  const current = zoomInfo?.data?.zoomFactor ?? 1;
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
  if (Math.abs(next - current) < 0.001) return;

  const result = await ipc.invoke<{ success: boolean; zoomFactor: number }>(
    "browser:setZoom",
    backendId,
    next
  );

  if (!result.success) {
    console.error("缩放失败:", result.error);
  }
}

async function updateViewHistory(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view?.backendId || !view.visible) return;

  try {
    const info = await ipc.getPageInfo(view.backendId);
    if (info.success && info.data) {
      viewHistoryMap.value[viewId] = {
        canGoBack: info.data.canGoBack,
        canGoForward: info.data.canGoForward,
      };
    }
  } catch (error) {
    console.error(`更新视图 ${viewId} 历史记录状态失败:`, error);
  }
}

async function handleGoBack(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view?.backendId || !view.visible) return;

  const result = await ipc.goBack(view.backendId);
  if (result.success) {
    updateViewHistory(viewId);
  }
}

async function handleGoForward(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view?.backendId || !view.visible) return;

  const result = await ipc.goForward(view.backendId);
  if (result.success) {
    updateViewHistory(viewId);
  }
}

function handleViewHiddenEvent(payload: { viewId: string }) {
  const view = viewsStore.views.find((v) => v.id === payload.viewId);
  if (!view) return;
  viewsStore.setVisibility(view.id, false);
  viewsStore.setBackendId(view.id, null);
  if (viewsStore.selectedViewId === view.id) {
    viewsStore.selectView(null);
  }
  updateAllVisibleViewBounds();
}

function handleViewsSyncEvent(_payload: {
  action: string;
  viewId: string;
  views: any[];
}) {
  // 当视图被创建或删除时，同步视图列表
  syncViews();
}

// 处理标题更新事件
function handleTitleUpdatedEvent(payload: { viewId: string; title: string }) {
  const view = viewsStore.views.find((v) => v.backendId === payload.viewId);
  if (view) {
    viewsStore.updateView(view.id, { title: payload.title });
  }
}

// 处理Favicon更新事件
function handleFaviconUpdatedEvent(payload: {
  viewId: string;
  favicon: string;
}) {
  const view = viewsStore.views.find((v) => v.backendId === payload.viewId);
  if (view) {
    viewsStore.updateView(view.id, { favicon: payload.favicon });
  }
}

// 处理Favicon加载错误
function handleFaviconError(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (view) {
    viewsStore.updateView(viewId, { favicon: undefined });
  }
}

// 处理加载状态变化事件
async function handleLoadingStateChanged(payload: {
  viewId: string;
  loading: boolean;
  error?: {
    errorCode: number;
    errorDescription: string;
    validatedURL: string;
  } | null;
}) {
  const view = viewsStore.views.find((v) => v.backendId === payload.viewId);
  if (view) {
    const updates: Partial<ViewItem> = {
      loading: payload.loading,
    };

    if (payload.loading) {
      updates.loadError = undefined;
    } else if (!payload.error) {
      updates.loadError = undefined;
    }

    viewsStore.updateView(view.id, updates);

    if (view.backendId) {
      if (payload.loading) {
        if (view.visible) {
          await ipc.setViewVisible(view.backendId, true);
        }
      } else if (payload.error) {
        await ipc.setViewVisible(view.backendId, false);
      } else if (view.visible) {
        await ipc.setViewVisible(view.backendId, true);
      }
    }
  }
}

// 处理加载失败事件
async function handleLoadFailed(payload: {
  viewId: string;
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
}) {
  const view = viewsStore.views.find((v) => v.backendId === payload.viewId);
  if (view) {
    if (view.backendId) {
      await ipc.setViewVisible(view.backendId, false);
    }

    viewsStore.updateView(view.id, {
      loading: false,
      loadError: {
        errorCode: payload.errorCode,
        errorDescription: payload.errorDescription,
        validatedURL: payload.validatedURL,
      },
    });
  }
}

function handleWindowResize() {
  updateAllVisibleViewBounds();
}

// 滚动时隐藏所有可见视图
function hideAllVisibleViews() {
  viewsStore.views.forEach((view) => {
    if (view.visible && view.backendId) {
      hideBackendView(view);
    }
  });
}

// 滚动结束后显示并更新所有可见视图
function showAllVisibleViews() {
  viewsStore.views.forEach((view) => {
    if (view.visible && view.backendId) {
      updateViewBoundsImmediate(view.id);
    }
  });
}

// 使用 debounce 延迟显示视图
const debouncedShowAllViews = debounce(showAllVisibleViews, 150);

function handleGridScroll() {
  // 滚动开始时立即隐藏所有视图
  hideAllVisibleViews();
  // 滚动结束后显示视图
  debouncedShowAllViews();
}

watch(
  () => viewsStore.selectedViewId,
  (newId) => {
    if (newId) {
      updateViewBounds(newId);
      updateViewHistory(newId);
    }
  }
);

watch(
  () => gridStore.pendingScrollViewId,
  async (viewId) => {
    if (!viewId) return;

    const success = await scrollToViewWithRetry(viewId);
    if (!success) {
      console.warn(`未能滚动到目标视图: ${viewId}`);
    }

    gridStore.setPendingScrollViewId(null);
  }
);

// 定期更新可见视图的历史记录状态
let historyUpdateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  window.addEventListener("resize", handleWindowResize);
  gridWrapperRef.value?.addEventListener("scroll", handleGridScroll);
  browserAPI?.on?.("ui:view-hidden", handleViewHiddenEvent);
  browserAPI?.on?.("views:sync", handleViewsSyncEvent);
  browserAPI?.on?.("views:title-updated", handleTitleUpdatedEvent);
  browserAPI?.on?.("views:favicon-updated", handleFaviconUpdatedEvent);
  browserAPI?.on?.("views:loading-state-changed", handleLoadingStateChanged);
  browserAPI?.on?.("views:load-failed", handleLoadFailed);

  // 每 2 秒更新一次历史记录状态
  historyUpdateInterval = setInterval(() => {
    viewsStore.views.forEach((view) => {
      if (view.visible && view.backendId) {
        updateViewHistory(view.id);
      }
    });
  }, 2000);

  // 重新挂载时，更新所有可见视图的位置并显示
  await nextTick();

  const pendingScrollViewId = gridStore.pendingScrollViewId;
  if (pendingScrollViewId) {
    const scrolled = await scrollToViewWithRetry(pendingScrollViewId);
    if (!scrolled) {
      console.warn(`进入网格模式时未能定位到视图: ${pendingScrollViewId}`);
    }
    gridStore.setPendingScrollViewId(null);
  }

  viewsStore.views.forEach(async (view) => {
    if (view.visible && view.backendId) {
      // 先计算并设置 bounds，再显示视图
      updateViewBoundsImmediate(view.id);
      await nextTick();
      await ipc.setViewVisible(view.backendId, true);
    }
  });
});

onUnmounted(async () => {
  window.removeEventListener("resize", handleWindowResize);
  gridWrapperRef.value?.removeEventListener("scroll", handleGridScroll);
  browserAPI?.off?.("ui:view-hidden", handleViewHiddenEvent);
  browserAPI?.off?.("views:sync", handleViewsSyncEvent);
  browserAPI?.off?.("views:title-updated", handleTitleUpdatedEvent);
  browserAPI?.off?.("views:favicon-updated", handleFaviconUpdatedEvent);
  browserAPI?.off?.("views:loading-state-changed", handleLoadingStateChanged);
  browserAPI?.off?.("views:load-failed", handleLoadFailed);

  if (historyUpdateInterval) {
    clearInterval(historyUpdateInterval);
    historyUpdateInterval = null;
  }

  // 卸载时隐藏所有可见的视图
  for (const view of viewsStore.views) {
    if (view.visible && view.backendId) {
      await ipc.setViewVisible(view.backendId, false);
    }
  }
});
</script>

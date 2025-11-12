<template>
  <div class="w-full h-full flex flex-col font-sans bg-white">
    <Header>
      <!-- 标签页区域 -->
      <div
        ref="tabContainerRef"
        class="flex-1 flex items-center h-full overflow-hidden"
      >
        <!-- 切换搜索栏按钮 -->
        <button
          class="ml-2 mr-1 w-4 h-7 flex items-center justify-center rounded hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
          @click="toggleAddressBar"
          :title="showAddressBar ? '隐藏搜索栏' : '显示搜索栏'"
        >
          <EllipsisVertical class="w-4 h-4" />
        </button>

        <!-- 标签页列表 -->
        <div
          class="flex h-full items-end px-1 flex-1 min-w-0 overflow-hidden"
          :style="{ gap: tabGap }"
        >
          <div
            v-for="(view, index) in viewsStore.views"
            :key="view.id"
            :style="{
              width: tabWidth,
              marginLeft: index > 0 ? tabMargin : '0',
              zIndex: view.selected ? (isOverlapMode ? 10 : 30) : 10,
              transform:
                view.selected && isOverlapMode ? 'translateX(-8px)' : 'none',
            }"
            :class="[
              'group relative flex items-center gap-2 h-8 rounded-t-lg cursor-pointer transition-all select-none border-t border-x',
              showTabTitle ? 'px-3' : 'px-2',
              view.selected
                ? 'bg-white border-gray-300 shadow-md'
                : 'bg-gray-100 hover:bg-gray-200 border-gray-200 hover:shadow-lg hover:z-20!',
            ]"
            @click="handleSelectTab(view.id)"
            @contextmenu.prevent="handleTabContextMenu($event, view.id)"
          >
            <!-- 网站图标 -->
            <img
              v-if="view.favicon"
              :src="view.favicon"
              class="w-3.5 h-3.5 shrink-0 object-contain"
              @error="handleFaviconError(view.id)"
              alt="favicon"
            />
            <Globe v-else class="w-3.5 h-3.5 shrink-0 text-gray-600" />

            <!-- 标题 -->
            <span
              v-show="showTabTitle"
              class="flex-1 text-xs truncate min-w-0 mr-1"
              :class="view.selected ? 'text-gray-900' : 'text-gray-600'"
            >
              {{ view.title || "新标签页" }}
            </span>

            <!-- 加载状态 -->
            <div
              v-if="view.loading"
              class="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin shrink-0"
            ></div>

            <!-- 关闭按钮 - 始终使用绝对定位固定在右侧 -->
            <button
              :class="[
                'absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded transition-all shrink-0',
                'opacity-0 group-hover:opacity-100',
                view.selected
                  ? 'bg-white hover:bg-gray-300'
                  : 'bg-gray-100 hover:bg-gray-300',
              ]"
              @click.stop="handleCloseTab(view.id)"
              title="关闭标签页"
            >
              <XMark class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- 新建标签页按钮 - 固定在右侧 -->
        <button
          class="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 transition-colors shrink-0 mr-1"
          @click="handleAddTab"
          title="新建标签页"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </Header>

    <!-- 导航栏 -->
    <div
      v-show="showAddressBar"
      class="h-12 flex items-center gap-2 px-3 border-b border-gray-300 bg-white"
    >
      <!-- 前进后退按钮 -->
      <div class="flex gap-1">
        <button
          class="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          @click="handleGoBack"
          :disabled="!canGoBack"
          title="后退"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          class="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          @click="handleGoForward"
          :disabled="!canGoForward"
          title="前进"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
        <button
          class="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors"
          @click="handleRefresh"
          title="刷新"
        >
          <ArrowPath class="w-5 h-5" />
        </button>
      </div>

      <!-- 地址栏 -->
      <div class="flex-1 flex items-center">
        <div
          class="w-full flex items-center gap-2 px-4 h-9 bg-gray-50 rounded-full border border-gray-300 hover:bg-white hover:shadow-sm transition-all"
        >
          <Globe class="w-4 h-4 text-gray-600 shrink-0" />
          <input
            ref="addressBarRef"
            v-model="addressBarValue"
            type="text"
            class="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            placeholder="搜索或输入网址"
            @keydown.enter="handleNavigate"
            @focus="handleAddressBarFocus"
            @blur="handleAddressBarBlur"
          />
        </div>
      </div>

      <!-- 右侧操作按钮 -->
      <div class="flex gap-1">
        <button
          class="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          @click="handleZoomOut"
          :disabled="!activeView"
          title="缩小"
        >
          <Minus class="w-4 h-4" />
        </button>
        <button
          class="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          @click="handleZoomIn"
          :disabled="!activeView"
          title="放大"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- WebContentsView 容器 -->
    <div ref="contentAreaRef" class="flex-1 bg-white relative overflow-hidden">
      <!-- 空状态 -->
      <div
        v-if="!activeView"
        class="w-full h-full flex flex-col items-center justify-center text-gray-400"
      >
        <Globe class="w-20 h-20 text-gray-300 mb-4" />
        <p class="text-lg text-gray-500">暂无打开的标签页</p>
        <p class="text-sm text-gray-400 mt-2">点击 "+" 按钮创建新标签页</p>
      </div>

      <!-- 加载失败状态 -->
      <div
        v-else-if="activeView.loadError"
        class="absolute inset-0 flex items-center justify-center bg-white p-8"
      >
        <div
          class="max-w-2xl w-full bg-red-50 border border-red-200 rounded-lg p-8 shadow-sm"
        >
          <div class="flex items-start gap-4">
            <!-- 错误图标 -->
            <div
              class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0"
            >
              <svg
                class="w-6 h-6 text-red-600"
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

            <!-- 错误信息 -->
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-red-900 mb-2">
                无法加载网页
              </h3>
              <p class="text-sm text-red-700 mb-3">
                {{ activeView.loadError.errorDescription }}
              </p>
              <div class="bg-white border border-red-200 rounded p-3 mb-4">
                <p class="text-xs text-gray-500 mb-1">请求的网址:</p>
                <p class="text-sm text-gray-900 break-all font-mono">
                  {{ activeView.loadError.validatedURL }}
                </p>
              </div>
              <div class="text-xs text-gray-600 mb-4">
                错误代码: {{ activeView.loadError.errorCode }}
              </div>

              <!-- 操作按钮 -->
              <div class="flex gap-3">
                <button
                  @click="handleRefresh"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  重新加载
                </button>
                <button
                  @click="handleGoBack"
                  v-if="canGoBack"
                  class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  返回上一页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div
        v-else-if="activeView.loading"
        class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-3">
          <div
            class="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"
          ></div>
          <p class="text-sm text-gray-600">加载中...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import Header from "@/components/Header.vue";
import { useViewsStore, type ViewItem } from "@/stores/views";
import { useIPC } from "@/composables/useIPC";
import ChevronLeft from "@/icons/ChevronLeft.vue";
import ChevronRight from "@/icons/ChevronRight.vue";
import EllipsisVertical from "@/icons/EllipsisVertical.vue";
import Globe from "@/icons/Globe.vue";
import ArrowPath from "@/icons/ArrowPath.vue";
import Minus from "@/icons/Minus.vue";
import Plus from "@/icons/Plus.vue";
import XMark from "@/icons/XMark.vue";

const viewsStore = useViewsStore();
const ipc = useIPC();

const contentAreaRef = ref<HTMLElement | null>(null);
const tabContainerRef = ref<HTMLElement | null>(null);
const addressBarRef = ref<HTMLInputElement | null>(null);
const addressBarValue = ref("");
const showAddressBar = ref(true);
const isAddressBarFocused = ref(false); // 地址栏是否处于聚焦状态

const browserAPI = (window as any)?.browserAPI;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

// 标签页宽度相关
const DEFAULT_TAB_WIDTH = 200; // 默认宽度
const MIN_TAB_WIDTH_WITH_TITLE = 120; // 显示标题的最小宽度
const MIN_TAB_WIDTH_WITH_CLOSE = 80; // 显示关闭按钮的最小宽度
const MIN_TAB_WIDTH = 32; // 最小宽度（只显示图标）- 图标14px + padding左右各8px
const NEW_TAB_BUTTON_WIDTH = 36; // 新建按钮宽度（包括margin）
const TOGGLE_BUTTON_WIDTH = 24; // 切换按钮宽度
const TAB_GAP = 2; // 标签页间隙
const CONTAINER_PADDING = 12; // 容器内边距

const tabWidth = ref(`${DEFAULT_TAB_WIDTH}px`);
const tabGap = ref("2px"); // 标签页间隙
const tabMargin = ref("0px"); // 标签页左边距（用于重叠效果）
const isOverlapMode = ref(false); // 是否处于重叠模式
const showTabTitle = ref(true);
const showCloseButton = ref(true);

// 当前激活的视图
const activeView = computed(() => viewsStore.selectedView);

// 导航状态
const canGoBack = ref(false);
const canGoForward = ref(false);

// 计算标签页宽度和显示模式
function calculateTabLayout() {
  if (!tabContainerRef.value) return;

  const containerWidth = tabContainerRef.value.clientWidth;
  const tabCount = viewsStore.views.length;

  if (tabCount === 0) {
    tabWidth.value = `${DEFAULT_TAB_WIDTH}px`;
    tabGap.value = "2px";
    tabMargin.value = "0px";
    isOverlapMode.value = false;
    showTabTitle.value = true;
    showCloseButton.value = true;
    return;
  }

  // 可用宽度 = 容器宽度 - 切换按钮 - 新建按钮 - 容器内边距
  const availableWidth =
    containerWidth -
    TOGGLE_BUTTON_WIDTH -
    NEW_TAB_BUTTON_WIDTH -
    CONTAINER_PADDING;

  // 第一档：空间足够，使用默认宽度
  const totalGap = (tabCount - 1) * TAB_GAP;
  const availableForTabs = availableWidth - totalGap;
  const averageWidth = availableForTabs / tabCount;

  console.log(
    `[标签页布局] 容器宽度: ${containerWidth}px, 标签数: ${tabCount}, 可用宽度: ${availableForTabs}px, 平均宽度: ${averageWidth.toFixed(
      2
    )}px`
  );

  if (averageWidth >= DEFAULT_TAB_WIDTH) {
    // 第一档：默认宽度，正常间隙
    tabWidth.value = `${DEFAULT_TAB_WIDTH}px`;
    tabGap.value = "2px";
    tabMargin.value = "0px";
    isOverlapMode.value = false;
    showTabTitle.value = true;
    showCloseButton.value = true;
    console.log(`[标签页布局] 档位: 第一档 - 默认宽度 ${DEFAULT_TAB_WIDTH}px`);
  } else if (averageWidth >= MIN_TAB_WIDTH_WITH_TITLE) {
    // 第二档：均分宽度，正常间隙
    tabWidth.value = `${Math.floor(averageWidth)}px`;
    tabGap.value = "2px";
    tabMargin.value = "0px";
    isOverlapMode.value = false;
    showTabTitle.value = true;
    showCloseButton.value = true;
    console.log(
      `[标签页布局] 档位: 第二档 - 均分宽度 ${Math.floor(averageWidth)}px`
    );
  } else if (averageWidth >= MIN_TAB_WIDTH_WITH_CLOSE) {
    // 第三档：隐藏标题，正常间隙
    tabWidth.value = `${Math.floor(averageWidth)}px`;
    tabGap.value = "2px";
    tabMargin.value = "0px";
    isOverlapMode.value = false;
    showTabTitle.value = false;
    showCloseButton.value = true;
    console.log(
      `[标签页布局] 档位: 第三档 - 隐藏标题 ${Math.floor(averageWidth)}px`
    );
  } else if (averageWidth >= MIN_TAB_WIDTH) {
    // 第四档：只显示图标，正常间隙
    const finalWidth = Math.max(MIN_TAB_WIDTH, Math.floor(averageWidth));
    tabWidth.value = `${finalWidth}px`;
    tabGap.value = "2px";
    tabMargin.value = "0px";
    isOverlapMode.value = false;
    showTabTitle.value = false;
    showCloseButton.value = false;
    console.log(`[标签页布局] 档位: 第四档 - 只显示图标 ${finalWidth}px`);
  } else {
    // 第五档：重叠模式（扑克牌效果）
    // 动态调整标签页宽度和重叠量

    // 最小可见宽度（每个标签至少要露出这么多）
    const minVisibleWidth = 24; // 至少露出24px，刚好能看到图标

    // 计算每个标签页可以有多少可见宽度
    const visibleWidth = availableWidth / tabCount;

    // 如果可见宽度太小，则使用最小值
    const actualVisibleWidth = Math.max(visibleWidth, minVisibleWidth);

    // 标签页的实际宽度（可见宽度 + 一些额外空间用于显示完整图标）
    const targetWidth = Math.max(Math.min(actualVisibleWidth + 32, 80), 48);

    // 计算重叠量 = 可见宽度 - 标签宽度
    const overlapAmount = actualVisibleWidth - targetWidth;

    tabWidth.value = `${Math.floor(targetWidth)}px`;
    tabGap.value = "0px";
    tabMargin.value = `${Math.floor(overlapAmount)}px`;
    isOverlapMode.value = true;
    showTabTitle.value = false;
    showCloseButton.value = false;

    console.log(
      `[标签页布局] 档位: 第五档 - 重叠模式，宽度 ${Math.floor(
        targetWidth
      )}px，可见宽度 ${Math.floor(actualVisibleWidth)}px，重叠 ${Math.abs(
        Math.floor(overlapAmount)
      )}px`
    );
  }
}

// 确保后端视图存在
async function ensureBackend(view: ViewItem | undefined) {
  if (!view) return null;
  if (view.backendId) return view.backendId;

  // 创建视图时设置为隐藏状态
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

// 更新视图位置和大小
async function updateViewBounds(retryCount = 0) {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 50; // 50ms

  if (!activeView.value?.backendId) {
    console.warn(`[更新Bounds] 没有活跃的视图或后端ID`);
    return;
  }

  if (!contentAreaRef.value) {
    console.warn(`[更新Bounds] contentAreaRef 未准备好`);
    return;
  }

  const rect = contentAreaRef.value.getBoundingClientRect();

  // 检查尺寸是否有效
  if (rect.width === 0 || rect.height === 0) {
    if (retryCount < MAX_RETRIES) {
      console.warn(
        `[更新Bounds] 容器尺寸无效: width=${rect.width}, height=${
          rect.height
        }，${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return updateViewBounds(retryCount + 1);
    } else {
      console.error(
        `[更新Bounds] 达到最大重试次数，容器尺寸仍然无效: width=${rect.width}, height=${rect.height}`
      );
      return;
    }
  }

  const bounds = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };

  console.log(`[更新Bounds] 设置视图边界:`, bounds);

  await ipc.updateViewBounds(activeView.value.backendId, bounds);
}

// 更新导航状态
async function updateNavigationState() {
  if (!activeView.value?.backendId) {
    canGoBack.value = false;
    canGoForward.value = false;
    return;
  }

  try {
    const info = await ipc.getPageInfo(activeView.value.backendId);
    if (info.success && info.data) {
      canGoBack.value = info.data.canGoBack;
      canGoForward.value = info.data.canGoForward;

      // 只在地址栏未聚焦时更新地址栏
      // 避免覆盖用户正在输入的内容
      if (info.data.url && !isAddressBarFocused.value) {
        addressBarValue.value = info.data.url;
      }

      // 更新标题
      if (info.data.title) {
        viewsStore.updateView(activeView.value.id, { title: info.data.title });
      }
    }
  } catch (error) {
    console.error("更新导航状态失败:", error);
  }
}

// 选择标签页
async function handleSelectTab(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view) return;

  console.log(
    `[标签页切换] 开始切换到标签页: ${view.title || "新标签页"} (ID: ${viewId})`
  );

  // 确保后端视图存在
  console.log(`[标签页切换] 确保后端视图存在`);
  const backendId = await ensureBackend(view);
  if (!backendId) {
    console.error(`[标签页切换] 创建后端视图失败`);
    return;
  }

  // 隐藏所有视图，确保只有选中的视图显示
  // 这是安全措施，避免多个视图同时显示
  for (const v of viewsStore.views) {
    if (v.backendId && v.backendId !== backendId) {
      await ipc.setViewVisible(v.backendId, false);
    }
  }

  // 选中新标签页
  viewsStore.selectView(viewId);

  // 等待DOM更新，然后显示新选中的视图
  await nextTick();

  // 先设置bounds，确保view在正确的位置
  console.log(`[标签页切换] 更新视图位置和大小`);
  await updateViewBounds();

  // 再显示view
  console.log(`[标签页切换] 显示视图 (backendId: ${backendId})`);
  await ipc.setViewVisible(backendId, true);

  // 更新导航状态
  await updateNavigationState();

  console.log(`[标签页切换] 切换完成`);
}

// 新建标签页
async function handleAddTab() {
  const newViewId = `view_${Date.now()}`;

  console.log(`[标签页创建] 创建新标签页 (ID: ${newViewId})`);

  // 添加到 store
  viewsStore.addView({
    id: newViewId,
    i: newViewId,
    title: "新标签页",
    url: "https://www.baidu.com",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    visible: false,
    backendId: null,
  });

  console.log(
    `[标签页创建] 标签页已添加到 store，当前标签页总数: ${viewsStore.views.length}`
  );

  // 重新计算标签页布局
  await nextTick();
  calculateTabLayout();

  // 立即切换到新标签页
  await handleSelectTab(newViewId);
}

// 关闭标签页
async function handleCloseTab(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view) return;

  console.log(
    `[标签页关闭] 关闭标签页: ${view.title || "新标签页"} (ID: ${viewId})`
  );

  // 保存要删除的view的backendId
  const backendIdToRemove = view.backendId;

  // 如果关闭的是当前标签页,切换到其他标签页
  if (view.selected && viewsStore.views.length > 1) {
    const currentIndex = viewsStore.views.findIndex((v) => v.id === viewId);
    const nextView =
      viewsStore.views[currentIndex + 1] || viewsStore.views[currentIndex - 1];
    if (nextView) {
      console.log(`[标签页关闭] 切换到其他标签页: ${nextView.title}`);
      // 先切换到其他标签页
      await handleSelectTab(nextView.id);
    }
  }

  // 删除后端视图（确保view被隐藏后再删除）
  if (backendIdToRemove) {
    console.log(`[标签页关闭] 删除后端视图 (backendId: ${backendIdToRemove})`);
    // 先隐藏view
    await ipc.setViewVisible(backendIdToRemove, false);
    // 再删除view
    await ipc.removeView(backendIdToRemove);
  }

  // 从 store 中移除
  viewsStore.removeView(viewId);
  console.log(
    `[标签页关闭] 标签页已从 store 移除，剩余标签页数: ${viewsStore.views.length}`
  );

  // 重新计算标签页布局
  await nextTick();
  calculateTabLayout();

  // 如果没有标签页了，自动创建一个新的
  if (viewsStore.views.length === 0) {
    console.log(`[标签页关闭] 所有标签页已关闭，自动创建新标签页`);
    await handleAddTab();
  }
}

// 导航到指定URL
async function handleNavigate() {
  if (!activeView.value?.backendId) return;

  let url = addressBarValue.value.trim();
  if (!url) return;

  // URL处理逻辑
  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://") &&
    !url.startsWith("file://")
  ) {
    const windowsDrivePattern = /^[a-zA-Z]:([\\\/]|$)/;
    const windowsNetworkPattern = /^\\\\/;
    const unixPathPattern = /^\//;

    const isWindowsPath =
      windowsDrivePattern.test(url) || windowsNetworkPattern.test(url);
    const isUnixPath = unixPathPattern.test(url);

    if (isWindowsPath || isUnixPath) {
      let filePath = url;

      // 处理 Windows 网络共享路径 \\server\share -> //server/share
      if (windowsNetworkPattern.test(filePath)) {
        filePath = filePath.replace(/^\\\\/, "//");
      }

      // 将反斜杠统一为正斜杠
      filePath = filePath.replace(/\\/g, "/");

      // Windows 驱动器路径确保为 /C:/...
      if (windowsDrivePattern.test(filePath) && !filePath.startsWith("/")) {
        filePath = "/" + filePath;
      }

      // Unix 路径直接拼接
      url = `file://${filePath.startsWith("/") ? "" : "/"}${filePath}`;
    } else if (url.includes(".")) {
      url = "https://" + url;
    } else {
      url = `https://www.baidu.com/s?wd=${encodeURIComponent(url)}`;
    }
  }

  // 同步地址栏显示最终的目标 URL
  addressBarValue.value = url;

  // 清除之前的错误状态
  viewsStore.updateView(activeView.value.id, {
    loadError: undefined,
    loading: true,
  });

  const result = await ipc.loadURL(activeView.value.backendId, url);
  if (result.success) {
    viewsStore.updateView(activeView.value.id, { url });
    addressBarRef.value?.blur();

    // 确保view的bounds正确
    await updateViewBounds();

    // 更新导航状态
    await updateNavigationState();
  } else {
    console.error("导航失败:", result.error);
    viewsStore.updateView(activeView.value.id, { loading: false });
  }
}

// 地址栏聚焦时全选
function handleAddressBarFocus() {
  isAddressBarFocused.value = true;
  addressBarRef.value?.select();
}

// 地址栏失焦
function handleAddressBarBlur() {
  isAddressBarFocused.value = false;
  // 失焦时同步一次最新的URL到地址栏
  updateNavigationState();
}

// 后退
async function handleGoBack() {
  if (!activeView.value?.backendId || !canGoBack.value) return;
  const result = await ipc.goBack(activeView.value.backendId);
  if (result.success) {
    await updateNavigationState();
  }
}

// 前进
async function handleGoForward() {
  if (!activeView.value?.backendId || !canGoForward.value) return;
  const result = await ipc.goForward(activeView.value.backendId);
  if (result.success) {
    await updateNavigationState();
  }
}

// 刷新
async function handleRefresh() {
  if (!activeView.value?.backendId) return;
  // 清除之前的错误状态
  viewsStore.updateView(activeView.value.id, {
    loadError: undefined,
    loading: true,
  });
  await ipc.reloadView(activeView.value.backendId);
  await updateNavigationState();
}

// 缩小
async function handleZoomOut() {
  await handleZoom(-ZOOM_STEP);
}

// 放大
async function handleZoomIn() {
  await handleZoom(ZOOM_STEP);
}

// 缩放
async function handleZoom(delta: number) {
  if (!activeView.value?.backendId) return;

  const zoomInfo = await ipc.invoke<{ zoomFactor: number }>(
    "browser:getZoom",
    activeView.value.backendId
  );
  const current = zoomInfo?.data?.zoomFactor ?? 1;
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
  if (Math.abs(next - current) < 0.001) return;

  const result = await ipc.invoke<{ success: boolean; zoomFactor: number }>(
    "browser:setZoom",
    activeView.value.backendId,
    next
  );

  if (!result.success) {
    console.error("缩放失败:", result.error);
  }
}

// 标签页右键菜单
function handleTabContextMenu(event: MouseEvent, viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view) return;

  const currentIndex = viewsStore.views.findIndex((v) => v.id === viewId);
  const totalCount = viewsStore.views.length;

  ipc.invoke("ui:showTabContextMenu", {
    screenX: event.screenX,
    screenY: event.screenY,
    viewId: view.id,
    backendId: view.backendId,
    currentIndex,
    totalCount,
  });
}

// 处理标签页菜单操作
async function handleTabMenuAction(payload: {
  action: string;
  viewId: string;
}) {
  const { action, viewId } = payload;

  console.log(`[标签页菜单] 执行操作: ${action}, viewId: ${viewId}`);

  switch (action) {
    case "reload":
      // 刷新页面
      await handleRefreshTab(viewId);
      break;
    case "close":
      // 关闭标签页
      await handleCloseTab(viewId);
      break;
    case "closeLeft":
      // 关闭左侧标签页
      await handleCloseLeftTabs(viewId);
      break;
    case "closeRight":
      // 关闭右侧标签页
      await handleCloseRightTabs(viewId);
      break;
    case "closeOthers":
      // 关闭其他标签页
      await handleCloseOtherTabs(viewId);
      break;
  }
}

// 刷新指定标签页
async function handleRefreshTab(viewId: string) {
  const view = viewsStore.views.find((v) => v.id === viewId);
  if (!view || !view.backendId) return;

  console.log(`[标签页刷新] 刷新标签页: ${view.title || "新标签页"}`);

  // 刷新前确保 bounds 正确
  if (view.selected && contentAreaRef.value) {
    console.log(`[标签页刷新] 更新视图位置和大小`);
    await updateViewBounds();
  }

  await ipc.reloadView(view.backendId);

  // 刷新后再次确保 bounds 正确
  if (view.selected) {
    await nextTick();
    await updateViewBounds();
  }
}

// 关闭左侧标签页
async function handleCloseLeftTabs(viewId: string) {
  const currentIndex = viewsStore.views.findIndex((v) => v.id === viewId);
  if (currentIndex <= 0) return;

  console.log(`[标签页关闭] 关闭左侧 ${currentIndex} 个标签页`);

  // 获取要关闭的标签页
  const tabsToClose = viewsStore.views.slice(0, currentIndex);

  // 逐个关闭
  for (const view of tabsToClose) {
    if (view.backendId) {
      await ipc.setViewVisible(view.backendId, false);
      await ipc.removeView(view.backendId);
    }
    viewsStore.removeView(view.id);
  }

  // 重新计算布局
  await nextTick();
  calculateTabLayout();
}

// 关闭右侧标签页
async function handleCloseRightTabs(viewId: string) {
  const currentIndex = viewsStore.views.findIndex((v) => v.id === viewId);
  if (currentIndex === -1 || currentIndex === viewsStore.views.length - 1)
    return;

  console.log(
    `[标签页关闭] 关闭右侧 ${
      viewsStore.views.length - currentIndex - 1
    } 个标签页`
  );

  // 获取要关闭的标签页
  const tabsToClose = viewsStore.views.slice(currentIndex + 1);

  // 逐个关闭
  for (const view of tabsToClose) {
    if (view.backendId) {
      await ipc.setViewVisible(view.backendId, false);
      await ipc.removeView(view.backendId);
    }
    viewsStore.removeView(view.id);
  }

  // 重新计算布局
  await nextTick();
  calculateTabLayout();
}

// 关闭其他标签页
async function handleCloseOtherTabs(viewId: string) {
  const currentView = viewsStore.views.find((v) => v.id === viewId);
  if (!currentView) return;

  console.log(
    `[标签页关闭] 关闭除 ${currentView.title || "新标签页"} 外的所有标签页`
  );

  // 获取要关闭的标签页（除了当前的）
  const tabsToClose = viewsStore.views.filter((v) => v.id !== viewId);

  // 逐个关闭
  for (const view of tabsToClose) {
    if (view.backendId) {
      await ipc.setViewVisible(view.backendId, false);
      await ipc.removeView(view.backendId);
    }
    viewsStore.removeView(view.id);
  }

  // 确保当前标签页被选中
  if (!currentView.selected) {
    await handleSelectTab(viewId);
  }

  // 重新计算布局
  await nextTick();
  calculateTabLayout();
}

// 切换地址栏显示/隐藏
function toggleAddressBar() {
  showAddressBar.value = !showAddressBar.value;
  // 切换后需要更新视图位置
  setTimeout(() => {
    updateViewBounds();
  }, 100);
}

// 窗口大小改变时更新视图位置
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
async function handleWindowResize() {
  // 防抖处理，避免频繁更新
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = setTimeout(async () => {
    console.log(`[窗口Resize] 更新视图位置和大小`);
    await updateViewBounds();
    resizeTimeout = null;
  }, 100);
}

// 同步视图列表
async function syncViews() {
  const result = await ipc.getAllViews();
  if (!result.success || !result.data) return;

  const backendViews = result.data.views;
  const backendViewIds = new Set(backendViews.map((v) => v.id));

  console.log(`[同步视图] 发现 ${backendViews.length} 个后端视图`);

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
  backendViews.forEach((view) => {
    const containerId = view.id;
    const existingView = viewsStore.views.find(
      (v) => v.backendId === containerId
    );

    if (existingView) {
      // 已存在的view：更新属性
      viewsStore.updateView(existingView.id, {
        title: view.title,
        url: view.url,
        backendId: view.id,
      });
    } else {
      // 新view：添加到列表
      viewsStore.addView({
        id: containerId,
        i: containerId,
        title: view.title,
        url: view.url,
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        visible: false,
        backendId: view.id,
      });
      console.log(
        `[同步视图] 添加新视图: ${view.title} (backendId: ${view.id})`
      );
    }
  });

  // 同步完成后，隐藏所有非选中的后端视图
  // 这很重要！因为后端的 WebContentsView 可能已经是显示状态
  await nextTick();

  const currentSelectedId = viewsStore.selectedViewId;
  const selectedBackendId = currentSelectedId
    ? viewsStore.views.find((v) => v.id === currentSelectedId)?.backendId
    : null;

  console.log(
    `[同步视图] 当前选中的视图 backendId: ${selectedBackendId || "无"}`
  );

  // 隐藏所有非选中的视图
  for (const view of viewsStore.views) {
    if (view.backendId && view.backendId !== selectedBackendId) {
      console.log(
        `[同步视图] 隐藏非选中视图: ${view.title} (backendId: ${view.backendId})`
      );
      await ipc.setViewVisible(view.backendId, false);
    }
  }
}

// 处理视图隐藏事件
function handleViewHiddenEvent(payload: { viewId: string }) {
  const view = viewsStore.views.find((v) => v.backendId === payload.viewId);
  if (!view) return;

  viewsStore.setBackendId(view.id, null);
  if (viewsStore.selectedViewId === view.id) {
    viewsStore.selectView(null);
  }
}

// 处理视图同步事件
function handleViewsSyncEvent() {
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
      // 开始加载时清除错误提示
      updates.loadError = undefined;
    } else if (!payload.error) {
      // 加载成功时清空错误信息
      updates.loadError = undefined;
    }

    viewsStore.updateView(view.id, updates);

    if (view.backendId) {
      if (view.selected) {
        if (payload.error) {
          await ipc.setViewVisible(view.backendId, false);
        } else {
          await ipc.setViewVisible(view.backendId, true);
        }
      } else {
        await ipc.setViewVisible(view.backendId, false);
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

    if (payload.validatedURL) {
      addressBarValue.value = payload.validatedURL;
    }
  }
}

// 监听活跃视图变化
watch(activeView, async (newView) => {
  if (newView) {
    await updateNavigationState();
  } else {
    addressBarValue.value = "";
    canGoBack.value = false;
    canGoForward.value = false;
  }
});

// 定期更新导航状态
let navigationUpdateInterval: ReturnType<typeof setInterval> | null = null;
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  window.addEventListener("resize", handleWindowResize);
  browserAPI?.on?.("ui:view-hidden", handleViewHiddenEvent);
  browserAPI?.on?.("views:sync", handleViewsSyncEvent);
  browserAPI?.on?.("views:title-updated", handleTitleUpdatedEvent);
  browserAPI?.on?.("views:favicon-updated", handleFaviconUpdatedEvent);
  browserAPI?.on?.("ui:tab-menu-action", handleTabMenuAction);
  browserAPI?.on?.("views:loading-state-changed", handleLoadingStateChanged);
  browserAPI?.on?.("views:load-failed", handleLoadFailed);

  // 监听标签页容器大小变化
  if (tabContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      calculateTabLayout();
    });
    resizeObserver.observe(tabContainerRef.value);
    console.log(`[标签页布局] 开始监听容器大小变化`);
  }

  // 监听标签页数量变化
  watch(
    () => viewsStore.views.length,
    (newLength, oldLength) => {
      console.log(`[标签页布局] 标签页数量变化: ${oldLength} -> ${newLength}`);
      nextTick(() => {
        calculateTabLayout();
      });
    }
  );

  // 初始计算标签页布局
  await nextTick();
  calculateTabLayout();

  // 每2秒更新一次导航状态
  navigationUpdateInterval = setInterval(() => {
    if (activeView.value?.backendId) {
      updateNavigationState();
    }
  }, 2000);

  // 【重要】首先同步后端视图列表
  // 这会自动隐藏所有非选中的视图，避免初始化时多个视图同时显示
  console.log(`[初始化] 开始同步后端视图`);
  await syncViews();

  // 等待 DOM 完全渲染
  await nextTick();

  // 延迟一下确保 contentAreaRef 有正确的尺寸
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 初始化时如果有视图,选中第一个
  if (viewsStore.views.length > 0 && !activeView.value) {
    const firstView = viewsStore.views[0];
    if (firstView) {
      console.log(`[初始化] 选中第一个标签页: ${firstView.title}`);
      await handleSelectTab(firstView.id);
    }
  } else if (viewsStore.views.length === 0) {
    // 如果没有视图,创建第一个
    console.log(`[初始化] 创建第一个标签页`);
    await handleAddTab();
  } else if (activeView.value?.backendId) {
    // 如果已经有选中的视图，重新显示它
    console.log(`[初始化] 显示已选中的标签页: ${activeView.value.title}`);
    await nextTick();
    await updateViewBounds();
    await ipc.setViewVisible(activeView.value.backendId, true);
  }
});

onUnmounted(async () => {
  window.removeEventListener("resize", handleWindowResize);
  browserAPI?.off?.("ui:view-hidden", handleViewHiddenEvent);
  browserAPI?.off?.("views:sync", handleViewsSyncEvent);
  browserAPI?.off?.("views:title-updated", handleTitleUpdatedEvent);
  browserAPI?.off?.("views:favicon-updated", handleFaviconUpdatedEvent);
  browserAPI?.off?.("ui:tab-menu-action", handleTabMenuAction);
  browserAPI?.off?.("views:loading-state-changed", handleLoadingStateChanged);
  browserAPI?.off?.("views:load-failed", handleLoadFailed);

  if (navigationUpdateInterval) {
    clearInterval(navigationUpdateInterval);
    navigationUpdateInterval = null;
  }

  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
    console.log(`[标签页布局] 停止监听容器大小变化`);
  }

  // 卸载时隐藏当前激活的视图
  if (activeView.value?.backendId) {
    await ipc.setViewVisible(activeView.value.backendId, false);
  }
});
</script>

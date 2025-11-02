// src/renderer/src/router/index.ts
// 路由配置

import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Grid",
    component: () => import("@/views/GridView.vue"),
    meta: {
      title: "Grid布局",
    },
  },
];

const router = createRouter({
  // Electron 环境必须使用 Hash 模式，因为使用 file:// 协议加载文件
  // History 模式在 file:// 协议下无法正常工作
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
  next();
});

export default router;

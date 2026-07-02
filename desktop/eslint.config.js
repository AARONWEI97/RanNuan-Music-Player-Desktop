import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'public/ranran/**',
    'RanRan-main/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // 数据拉取、弹窗重置等场景在 effect 里 setLoading/setTab 是常规写法
      'react-hooks/set-state-in-effect': 'off',
      // ref 同步最新回调是项目内分页/滚动 hook 的既定模式
      'react-hooks/refs': 'off',
      // 历史代码大量 API 响应解析仍用 any，先降级为 warning，避免阻塞开发
      '@typescript-eslint/no-explicit-any': 'warn',
      // Hook 导出与组件同文件是本项目 KeepAlive 的既定结构
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])

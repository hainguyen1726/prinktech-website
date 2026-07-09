import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  // Bỏ qua các file script Node.js CJS và file cấu hình
  {
    ignores: [
      "check-and-fix.js",
      "check-and-fix.sh",
      "node_modules/**",
      ".next/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Ghi đè rule cho toàn bộ dự án
  {
    rules: {
      // Hạ xuống warning vì API routes dùng any cho Supabase response
      "@typescript-eslint/no-explicit-any": "warn",
      // Hạ xuống warning cho biến chưa sử dụng để tránh chặn CI
      "@typescript-eslint/no-unused-vars": "warn",
      // Hạ xuống warning cho các ký tự đặc biệt trong React/JSX
      "react/no-unescaped-entities": "warn",
      // Cảnh báo thay vì lỗi cho img element (cần migrate dần sang next/image)
      "@next/next/no-img-element": "warn",
      // Cảnh báo custom font trong layout
      "@next/next/no-page-custom-font": "warn",
    },
  },
];

export default eslintConfig;

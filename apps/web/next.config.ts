import type { NextConfig } from "next";

// Toàn bộ đăng nhập/phân quyền nằm ở backend NestJS (backend/). FE gọi cùng origin `/api/v1/*` và Next
// chuyển tiếp sang backend — nhờ vậy cookie phiên httpOnly do backend set là first-party, không cần CORS.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;

import { redirect } from "next/navigation";

// Bản MVP mock dùng chung một màn đăng nhập demo cho cả 4 vai trò.
export default function AdminLoginPage() {
  redirect("/login?as=admin");
}

"use client";

import { useSyncExternalStore } from "react";
import { Modal } from "@/components/ui/Modal";
import { PhoneVerifyCard } from "./PhoneVerifyCard";

type Retry = () => void;

let pending: Retry | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/**
 * Backend trả `phone_not_verified` cho thao tác "nhận việc": mở hộp thoại xác thực SĐT NGAY TẠI CHỖ (không bắt Host
 * rời màn sang trang Tài khoản). Xác thực xong tự chạy lại đúng thao tác vừa bị chặn.
 */
export function requestPhoneVerify(retry: Retry) {
  pending = retry;
  emit();
}

const close = () => {
  pending = null;
  emit();
};

/** Gắn MỘT lần trong shell cổng Host. */
export function PhoneVerifyGate() {
  const retry = useSyncExternalStore(subscribe, () => pending, () => null);
  return (
    <Modal open={!!retry} onClose={close} title="Xác thực số điện thoại">
      <div style={{ padding: 24 }}>
        <PhoneVerifyCard
          me={{ isPhoneVerified: false, phone: null }}
          description="Cần xác thực một lần để nhận ca. Xác thực xong, thao tác bạn vừa bấm sẽ tự chạy lại."
          onVerified={() => {
            const run = pending;
            close();
            run?.();
          }}
        />
      </div>
    </Modal>
  );
}

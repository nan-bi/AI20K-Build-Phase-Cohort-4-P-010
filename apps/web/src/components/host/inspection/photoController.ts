import type { UploadItem } from "@/lib/inspection/useInspectionUploads";
import type { InspectionPhotoView, ListingRoom } from "@/lib/inspection/types";

/** Gói thao tác ảnh dùng chung cho mọi khối của phiếu (tránh truyền hàng chục props qua từng khối). */
export interface PhotoController {
  photosOf: (slot: string) => InspectionPhotoView[];
  uploadsOf: (slot: string) => UploadItem[];
  /** URL xem trước cục bộ theo id ảnh đã lên (dùng khi link ký chưa có). */
  previews: Record<string, string>;
  add: (slot: string, room: ListingRoom | undefined, files: File[]) => void;
  remove: (photoId: string) => void;
  retry: (localId: string) => void;
  force: (localId: string) => void;
  dismiss: (localId: string) => void;
  removing: ReadonlySet<string>;
  /** Số ảnh còn thêm được trong tổng hạn mức hồ sơ. */
  totalLeft: number;
  perLineMax: number;
  listingMax: number;
}

import type { Metadata, Viewport } from "next";
import { AssistantProvider } from "@/components/chat/AssistantProvider";
import { ChatExperience } from "@/components/chat/ChatExperience";
import { Landing } from "@/components/landing/Landing";
import { SiteNav } from "@/components/nav/SiteNav";
import { LandingPreferences } from "@/components/landing/LandingPreferences";

export const metadata: Metadata = {
  title: "VinStay AI — Tìm nhà và quản lý cho thuê thông minh",
  description: "Tìm căn hộ đang mở tại Vinhomes Ocean Park 1, đối chiếu chi phí thuê và đặt lịch xem. Chủ nhà có thể gửi hồ sơ và theo dõi quy trình trên VinStay.",
  openGraph: {
    title: "VinStay AI — Tìm nhà và quản lý cho thuê thông minh",
    description: "Tìm căn hộ đang mở, đối chiếu chi phí tháng và theo dõi lịch xem trên một nền tảng.",
    type: "website",
    locale: "vi_VN",
  },
};

export const viewport: Viewport = { themeColor: "#0b1b3f" };

export default function HomePage() {
  return (
    <LandingPreferences>
      <AssistantProvider>
        <SiteNav variant="overlay" />
        {/* id="top" đặt trên <main> cho "Lên đầu trang" ở footer — không dùng #top để mở trợ lý (B3). */}
        <main id="top">
          <ChatExperience below={<Landing />} />
        </main>
      </AssistantProvider>
    </LandingPreferences>
  );
}

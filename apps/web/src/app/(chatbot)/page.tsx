import { ChatExperience } from "@/components/chat/ChatExperience";
import { Landing } from "@/components/landing/Landing";
import { SiteNav } from "@/components/nav/SiteNav";

export default function HomePage() {
  return (
    <>
      <div id="top" />
      <SiteNav />
      <main>
        <ChatExperience below={<Landing />} />
      </main>
    </>
  );
}

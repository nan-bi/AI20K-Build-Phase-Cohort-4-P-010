"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  text: string;
  time?: string;
}

const SAMPLE_PROMPTS = [
  "Tìm căn Studio dưới 7 triệu",
  "Căn 2PN The Sapphire có phí dịch vụ bao nhiêu?",
  "Chi phí All-in khi thuê căn hộ gồm những gì?",
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Xin chào! Tôi là trợ lý ảo VinStay AI. Bạn đang muốn tìm thuê căn hộ phân khu nào tại Vinhomes Ocean Park?",
      time: "Vừa xong",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const currentTime = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: Message = { role: "user", text, time: currentTime };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // TODO [Backend]: Khi bạn dựng xong API (ví dụ POST /api/chat hoặc gọi FastAPI),
    // chỉ cần thay đoạn timeout này bằng lệnh fetch:
    // const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ message: text }) });
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `[BE Mock Response] Hệ thống đã nhận: "${text}". Đang sẵn sàng kết nối API xử lý!`,
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setIsLoading(false);
    }, 600);
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "16px 20px",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header gọn gàng kèm link test các role */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--ink)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            VS
          </div>
          <div>
            <strong style={{ fontSize: 16, display: "block" }}>VinStay AI</strong>
            <span style={{ fontSize: 12, color: "var(--slate)" }}>
              Vinhomes Ocean Park Rental Assistant
            </span>
          </div>
        </div>
        <Link
          href="/login"
          style={{
            fontSize: 14,
            color: "var(--slate)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--line)",
          }}
        >
          Đăng nhập
        </Link>
      </header>

      {/* Khung tin nhắn */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "78%",
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--slate)" }}>
                {isUser ? "Bạn" : "VinStay AI"} • {m.time}
              </span>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  lineHeight: 1.5,
                  fontSize: 14,
                  background: isUser ? "var(--ink)" : "var(--paper)",
                  color: isUser ? "#ffffff" : "var(--ink-text)",
                  border: isUser ? "none" : "1px solid var(--line)",
                  borderTopRightRadius: isUser ? 2 : 12,
                  borderTopLeftRadius: isUser ? 12 : 2,
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ alignSelf: "flex-start", fontSize: 12, color: "var(--slate)", padding: "4px 8px" }}>
            VinStay AI đang suy nghĩ...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Gợi ý câu hỏi nhanh để test BE */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {SAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            style={{
              whiteSpace: "nowrap",
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 20,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink-text)",
              cursor: "pointer",
            }}
          >
            💬 {prompt}
          </button>
        ))}
      </div>

      {/* Form nhập tin nhắn */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn để test API..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "12px 14px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "var(--surface)",
            color: "var(--ink-text)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: 0,
            background: "var(--ink)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            opacity: isLoading || !input.trim() ? 0.6 : 1,
          }}
        >
          Gửi
        </button>
      </form>
    </main>
  );
}

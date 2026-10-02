# AI Service Status (`src/`, FastAPI + LangGraph)

Nguồn: đọc trực tiếp các file `src/**/*.py` (nhánh `main`, `0334ebf`). Chỉ kết luận khi có bằng chứng trong file.

## Kết luận tổng

Không file nào trong `src/` chứa logic riêng của VinStay (không có Matchmaker, OCR CCCD, Dispatcher, Conflict Resolver). Toàn bộ là khung mẫu AI20K. Bằng chứng: tiêu đề app `AI20K Agent`, mô tả `AI Agent built with LangGraph` (`src/main.py`), các `TODO` còn nguyên trong node/tool, và không có từ khóa VinStay nào trong `src/`.

## Phân loại file

| File | Trạng thái | Bằng chứng |
|---|---|---|
| `src/main.py` | Khung mẫu chạy được | App FastAPI, CORS theo `settings.cors_origins`, mount router `/api/v1`, `GET /health`; title `AI20K Agent` |
| `src/api/routes.py` | Khung mẫu | `POST /chat` gọi `agent.ainvoke({"query": ...})`; `GET /status` trả chuỗi cố định `LangGraph Agent v1.0` |
| `src/agents/graph.py` | Khung mẫu | `StateGraph`: `analyze` -> (có `error` thì END, ngược lại `respond`) -> END |
| `src/agents/state.py` | Khung mẫu | `AgentState` (TypedDict, total=False): query, context, analysis, response, error, metadata |
| `src/agents/nodes/example_node.py` | Template (tên `example_`, còn `TODO`) | `analyze_node` chỉ ghép chuỗi `Phân tích: {query}`; `respond_node` ghép `Kết quả dựa trên phân tích: ...`. Không gọi LLM |
| `src/agents/tools/example_tool.py` | Template | `search_knowledge` trả chuỗi cố định (`TODO: Implement actual search logic`); `calculate` là bộ tính biểu thức AST an toàn (logic thật nhưng không liên quan nghiệp vụ) |
| `src/services/llm.py` | Khung mẫu, chưa được dùng | `get_llm()` tạo `ChatOpenAI`; grep trong `src/` không thấy nơi nào gọi `get_llm` |
| `src/models/schemas.py` | Khung mẫu | `ChatRequest(message 1-5000 ký tự)`, `ChatResponse(response, analysis)` |
| `src/config.py` | Khung mẫu | `Settings` (pydantic-settings, đọc `.env`): `openai_api_key`, `model_name` mặc định `gpt-4o-mini`, `database_url` mặc định `sqlite`, `chroma_persist_dir`... |

## Node / Tool / Endpoint hiện có

| Loại | Tên | Đang làm gì |
|---|---|---|
| Node | `analyze` (`analyze_node`) | Trả `{"analysis": "Phân tích: <query>"}`; không gọi LLM |
| Node | `respond` (`respond_node`) | Trả `{"response": "Kết quả dựa trên phân tích: ..."}`, hoặc `Lỗi: ...` nếu state có `error` |
| Edge có điều kiện | `should_continue` | `error` có giá trị -> `END`, ngược lại -> `respond` |
| Tool | `search_knowledge` | Chuỗi cố định, không tra cứu thật |
| Tool | `calculate` | Tính biểu thức số học bằng AST |
| Endpoint | `POST /api/v1/chat` | Chạy graph, trả `response` + `analysis`; mọi exception -> HTTP 500 với `str(e)` |
| Endpoint | `GET /api/v1/status` | Trả `{"status": "ready", "agent": "LangGraph Agent v1.0"}` |
| Endpoint | `GET /health` | Trả `{"status": "ok", "env": ...}` |

## CHƯA RÕ

- Tool `search_knowledge` và `calculate`: không thấy chỗ nào gắn vào graph (graph chỉ có 2 node). Có thể dùng ở nơi khác ngoài `src/`: CHƯA RÕ.
- `chroma_persist_dir`, `database_url` có trong `Settings`, nhưng không thấy mã nào trong `src/` dùng chúng: CHƯA RÕ.
- `routes.py` trả `str(e)` trong HTTP 500: ghi nhận là sự kiện, không đánh giá.
- Kiểm thử: `tests/conftest.py` có fixture `mock_llm`; kết quả chạy xem `TEST_INVENTORY.md` (pytest 5/5 qua lệnh thay thế).

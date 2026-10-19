import { request } from "../httpClient"

export async function chatWithAi(message: string): Promise<string> {
  const response = await request<{ reply: string }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(45000),
  })
  if (!response.reply?.trim()) throw new Error("Trợ lý AI chưa có phản hồi. Vui lòng thử lại.")
  return response.reply
}

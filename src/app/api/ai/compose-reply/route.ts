import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { callGemini } from "@/lib/ai/gemini";

export async function POST(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { emailContext, userPrompt, targetLanguage = "en" } = (await request.json()) as {
			emailContext?: string;
			userPrompt?: string;
			targetLanguage?: string;
		};

		if (!userPrompt?.trim() && !emailContext?.trim()) {
			return NextResponse.json({ error: "Context or prompt is required" }, { status: 400 });
		}

		const systemInstruction =
			"Bạn là trợ lý soạn thảo email kinh doanh chuyên nghiệp hỗ trợ người dùng Việt Nam làm việc với đối tác quốc tế.\n" +
			"Yêu cầu đặc biệt: Bạn PHẢI trả về ĐÚNG ĐỊNH DẠNG JSON với 2 trường:\n" +
			"1. \"vietnameseVersion\": Bản dịch hoặc giải thích nội dung thư bằng Tiếng Việt đầy đủ, tự nhiên để người dùng người Việt đọc hiểu rõ ý nghĩa những gì sẽ gửi.\n" +
			"2. \"replyBody\": Bản email soạn thảo bằng ngôn ngữ của người nhận (mặc định là Tiếng Anh chuẩn mực, lịch sự, chuyên nghiệp) sẵn sàng để gửi đi.\n" +
			"Tuyệt đối không bọc trong markdown code fence khác ngoài json thuần túy.";

		const prompt = `[NGỮ CẢNH EMAIL GỐC / THÔNG TIN LIÊN QUAN]:\n${emailContext || "Soạn thư mới"}\n\n[Ý ĐỊNH / CHỈ THỊ CỦA NGƯỜI DÙNG BẰNG TIẾNG VIỆT]:\n${userPrompt || "Hãy soạn thư trả lời lịch sự, đầy đủ ý theo ngữ cảnh trên"}\n\nNgôn ngữ email cần gửi: ${targetLanguage === "en" ? "Tiếng Anh" : targetLanguage}.\nHãy trả về JSON { "vietnameseVersion": "...", "replyBody": "..." }`;

		const rawOutput = await callGemini(prompt, systemInstruction);
		
		let parsed: { vietnameseVersion?: string; replyBody?: string };
		try {
			const cleaned = rawOutput.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
			parsed = JSON.parse(cleaned);
		} catch {
			parsed = {
				vietnameseVersion: "Không thể phân tách định dạng JSON tự động.",
				replyBody: rawOutput,
			};
		}

		return NextResponse.json({
			vietnameseVersion: parsed.vietnameseVersion || "",
			replyBody: parsed.replyBody || "",
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to compose reply";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

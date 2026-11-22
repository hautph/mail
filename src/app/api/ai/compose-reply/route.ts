import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { callGemini } from "@/lib/ai/gemini";
import { getLanguageName } from "@/lib/ai/languages";

export async function POST(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { emailContext, userPrompt, targetLanguage = "en", userLanguage = "vi" } = (await request.json()) as {
			emailContext?: string;
			userPrompt?: string;
			targetLanguage?: string;
			userLanguage?: string;
		};

		if (!userPrompt?.trim() && !emailContext?.trim()) {
			return NextResponse.json({ error: "Context or prompt is required" }, { status: 400 });
		}

		const targetLangName = getLanguageName(targetLanguage);
		const userLangName = getLanguageName(userLanguage);

		const systemInstruction =
			"Bạn là trợ lý soạn thảo email kinh doanh chuyên nghiệp hỗ trợ người dùng giao tiếp và làm việc với đối tác quốc tế.\n" +
			"Yêu cầu đặc biệt: Bạn PHẢI trả về ĐÚNG ĐỊNH DẠNG JSON với 2 trường:\n" +
			`1. "userVersion": Bản dịch hoặc giải thích nội dung thư bằng ${userLangName} đầy đủ, tự nhiên để người dùng đọc hiểu rõ ý nghĩa những gì sẽ gửi.\n` +
			`2. "replyBody": Bản email soạn thảo bằng ngôn ngữ của người nhận (${targetLangName}) chuẩn mực, lịch sự, chuyên nghiệp sẵn sàng để gửi đi.\n` +
			"Tuyệt đối không bọc trong markdown code fence khác ngoài json thuần túy.";

		const prompt = `[NGỮ CẢNH EMAIL GỐC / THÔNG TIN LIÊN QUAN]:\n${emailContext || "Soạn thư mới"}\n\n[Ý ĐỊNH / CHỈ THỊ CỦA NGƯỜI DÙNG]:\n${userPrompt || "Hãy soạn thư trả lời lịch sự, đầy đủ ý theo ngữ cảnh trên"}\n\nNgôn ngữ người dùng muốn đọc hiểu: ${userLangName}.\nNgôn ngữ email cần gửi đi: ${targetLangName}.\nHãy trả về JSON { "userVersion": "...", "replyBody": "..." }`;

		const rawOutput = await callGemini(prompt, systemInstruction);
		
		let parsed: { userVersion?: string; vietnameseVersion?: string; replyBody?: string };
		try {
			const cleaned = rawOutput.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
			parsed = JSON.parse(cleaned);
		} catch {
			parsed = {
				userVersion: "Không thể phân tách định dạng JSON tự động.",
				replyBody: rawOutput,
			};
		}

		return NextResponse.json({
			userVersion: parsed.userVersion || parsed.vietnameseVersion || "",
			replyBody: parsed.replyBody || "",
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to compose reply";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

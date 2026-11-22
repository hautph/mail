import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { generateAiText } from "@/lib/ai/generate";
import { getLanguageName } from "@/lib/ai/languages";

export async function POST(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { text, targetLang = "vi" } = (await request.json()) as { text?: string; targetLang?: string };
		if (!text?.trim()) {
			return NextResponse.json({ error: "Text is required" }, { status: 400 });
		}

		const langName = getLanguageName(targetLang);
		const systemInstruction = 
			`Bạn là trợ lý email thông minh. Nhiệm vụ của bạn là đọc nội dung email được cung cấp (bằng bất kỳ ngôn ngữ nào) ` +
			`và tóm tắt lại các ý chính súc tích, rõ ràng bằng ${langName} (3-5 gạch đầu dòng ngắn gọn, nêu rõ người gửi muốn gì/cần phản hồi gì). ` +
			"Chỉ trả về nội dung tóm tắt bằng ngôn ngữ được yêu cầu, không kèm lời mở đầu hay kết thúc.";

		const summary = await generateAiText({
			env,
			prompt: text,
			systemInstruction,
		});

		return NextResponse.json({ summary });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to summarize email";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

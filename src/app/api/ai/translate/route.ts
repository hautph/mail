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
		const { text, targetLang = "vi" } = (await request.json()) as { text?: string; targetLang?: string };
		if (!text?.trim()) {
			return NextResponse.json({ error: "Text is required" }, { status: 400 });
		}

		const langName = targetLang === "vi" ? "Tiếng Việt" : "Tiếng Anh";
		const systemInstruction = 
			`Bạn là chuyên gia dịch thuật email chuyên nghiệp. Hãy dịch toàn bộ nội dung email được cung cấp sang ${langName}. ` +
			"Văn phong tự nhiên, chuẩn mực thương mại/công sở, giữ nguyên các thông tin như ngày giờ, số liệu, tên riêng. " +
			"Chỉ trả về nội dung đã dịch, không thêm chú thích hay lời chào đầu/cuối của AI.";

		const translated = await callGemini(text, systemInstruction);
		return NextResponse.json({ translated });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to translate email";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

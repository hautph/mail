"use client";

import { useState } from "react";
import { FileText, Globe2, ChevronDown, ChevronUp, Loader2, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth/client";

interface EmailAiAssistantProps {
	textBody: string | null;
	htmlBody: string | null;
	subject?: string;
}

export function EmailAiAssistant({ textBody, htmlBody, subject }: EmailAiAssistantProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"summary" | "translate" | null>(null);
	const [summary, setSummary] = useState<string | null>(null);
	const [translation, setTranslation] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const content = textBody || (htmlBody ? htmlBody.replace(/<[^>]+>/g, " ") : "");

	async function handleSummarize() {
		if (summary) {
			setActiveTab("summary");
			setIsOpen(true);
			return;
		}

		if (!content.trim()) {
			setError("Email không có nội dung văn bản để tóm tắt.");
			return;
		}

		setLoading(true);
		setError(null);
		setActiveTab("summary");
		setIsOpen(true);

		try {
			const res = await authFetch("/api/ai/summarize", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: `Tiêu đề: ${subject || ""}\n\n${content}` }),
			});

			const data = (await res.json()) as { summary?: string; error?: string };
			if (!res.ok || data.error) {
				throw new Error(data.error || "Không thể tóm tắt email");
			}

			setSummary(data.summary || "Không có nội dung tóm tắt.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
		} finally {
			setLoading(false);
		}
	}

	async function handleTranslate() {
		if (translation) {
			setActiveTab("translate");
			setIsOpen(true);
			return;
		}

		if (!content.trim()) {
			setError("Email không có nội dung văn bản để dịch.");
			return;
		}

		setLoading(true);
		setError(null);
		setActiveTab("translate");
		setIsOpen(true);

		try {
			const res = await authFetch("/api/ai/translate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: content, targetLang: "vi" }),
			});

			const data = (await res.json()) as { translated?: string; error?: string };
			if (!res.ok || data.error) {
				throw new Error(data.error || "Không thể dịch email");
			}

			setTranslation(data.translated || "Không có bản dịch.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
		} finally {
			setLoading(false);
		}
	}

	if (!content.trim()) return null;

	return (
		<div className="mt-3 border-t border-neutral-100 pt-2">
			{/* Subdued clean toolbar buttons - standard neutral design */}
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleSummarize}
					className={`h-8 gap-1.5 rounded-lg text-xs font-normal ${
						activeTab === "summary" && isOpen ? "border-neutral-300 bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
					}`}
				>
					<FileText className="h-3.5 w-3.5 text-neutral-500" />
					Tóm tắt (Tiếng Việt)
				</Button>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleTranslate}
					className={`h-8 gap-1.5 rounded-lg text-xs font-normal ${
						activeTab === "translate" && isOpen ? "border-neutral-300 bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
					}`}
				>
					<Globe2 className="h-3.5 w-3.5 text-neutral-500" />
					Dịch sang Tiếng Việt
				</Button>

				{isOpen && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setIsOpen(false)}
						className="ml-auto h-7 px-2 text-xs text-neutral-400 hover:text-neutral-700"
					>
						Đóng
					</Button>
				)}
			</div>

			{/* Subdued Content Panel */}
			{isOpen && (
				<div className="mt-2 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 text-sm text-neutral-800 transition-all">
					<div className="mb-2 flex items-center justify-between border-b border-neutral-200/60 pb-1.5">
						<span className="font-medium text-xs text-neutral-600 uppercase tracking-wider">
							{activeTab === "summary" ? "Tóm tắt nội dung chính" : "Bản dịch Tiếng Việt"}
						</span>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="text-neutral-400 hover:text-neutral-600"
							aria-label="Đóng"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					{loading ? (
						<div className="flex items-center gap-2 py-3 text-xs text-neutral-500">
							<Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
							<span>Đang xử lý...</span>
						</div>
					) : error ? (
						<p className="py-1 text-xs text-red-600">{error}</p>
					) : activeTab === "summary" ? (
						<div className="whitespace-pre-line text-xs leading-relaxed text-neutral-700">
							{summary}
						</div>
					) : (
						<div className="whitespace-pre-line text-xs leading-relaxed text-neutral-700">
							{translation}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

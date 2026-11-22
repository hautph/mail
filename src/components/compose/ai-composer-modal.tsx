"use client";

import { useState } from "react";
import { FileText, Globe2, Loader2, X, Check, ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth/client";

interface AiComposerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApply: (text: string) => void;
	currentSubject?: string;
}

export function AiComposerModal({ isOpen, onClose, onApply, currentSubject }: AiComposerModalProps) {
	const [prompt, setPrompt] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ vietnameseVersion: string; replyBody: string } | null>(null);

	if (!isOpen) return null;

	async function handleGenerate() {
		if (!prompt.trim()) {
			setError("Vui lòng nhập ý định hoặc dàn ý email bằng tiếng Việt.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await authFetch("/api/ai/compose-reply", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					emailContext: currentSubject ? `Chủ đề email: ${currentSubject}` : "",
					userPrompt: prompt,
					targetLanguage: "en",
				}),
			});

			const data = (await res.json()) as {
				vietnameseVersion?: string;
				replyBody?: string;
				error?: string;
			};

			if (!res.ok || data.error) {
				throw new Error(data.error || "Không thể tạo nội dung email");
			}

			setResult({
				vietnameseVersion: data.vietnameseVersion || "",
				replyBody: data.replyBody || "",
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
		} finally {
			setLoading(false);
		}
	}

	function handleApply() {
		if (result?.replyBody) {
			onApply(result.replyBody);
			onClose();
		}
	}

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
			<div className="flex w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden max-h-[90vh]">
				{/* Header - Simple, clean, neutral */}
				<div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-neutral-600" />
						<h3 className="text-sm font-semibold text-neutral-900">
							Trợ lý soạn thư song ngữ (Việt - Anh)
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
						aria-label="Đóng"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					<div>
						<Label className="text-xs font-medium text-neutral-700">
							Nhập ý tưởng / nội dung bạn muốn diễn đạt bằng Tiếng Việt:
						</Label>
						<Textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="Ví dụ: Cảm ơn đối tác đã gửi báo giá, chúng tôi đồng ý mức giá nhưng đề xuất thời gian giao hàng sớm hơn vào thứ 6 tuần sau..."
							className="mt-1.5 h-24 text-xs resize-none rounded-xl"
							disabled={loading}
						/>
						{error && <p className="mt-1 text-xs text-red-600">{error}</p>}
					</div>

					<div className="flex justify-end">
						<Button
							type="button"
							size="sm"
							onClick={handleGenerate}
							disabled={loading || !prompt.trim()}
							className="h-8 gap-1.5 rounded-lg text-xs"
						>
							{loading ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									Đang soạn thảo...
								</>
							) : (
								"Soạn thư bằng AI"
							)}
						</Button>
					</div>

					{/* Dual View Result */}
					{result && (
						<div className="space-y-3 border-t border-neutral-100 pt-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{/* Vietnamese Explanation / Preview */}
								<div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
									<div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-200/60">
										<span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
											Bản Tiếng Việt (Xem trước ý nghĩa)
										</span>
									</div>
									<div className="whitespace-pre-line text-xs text-neutral-700 leading-relaxed max-h-56 overflow-y-auto">
										{result.vietnameseVersion || "Không có bản giải thích."}
									</div>
								</div>

								{/* English Mail to Send */}
								<div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs">
									<div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100">
										<span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
											Bản Tiếng Anh (Nội dung sẽ gửi)
										</span>
									</div>
									<div className="whitespace-pre-line text-xs text-neutral-900 leading-relaxed max-h-56 overflow-y-auto font-sans">
										{result.replyBody}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
					<p className="text-[11px] text-neutral-500">
						Chỉ nội dung Tiếng Anh được chèn vào email khi bấm áp dụng.
					</p>
					<div className="flex items-center gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
							Hủy
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={handleApply}
							disabled={!result?.replyBody}
							className="h-8 gap-1.5 rounded-lg text-xs"
						>
							<Check className="h-3.5 w-3.5" />
							Chèn vào email
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

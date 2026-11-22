"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, X, Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth/client";
import { useLanguage } from "@/components/language-provider";
import { COMMON_AI_LANGUAGES, getLanguageDisplayName } from "@/lib/ai/languages";

interface AiComposerModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApply: (text: string) => void;
	currentSubject?: string;
}

const STORAGE_KEY_TARGET_LANG = "mailflare-ai:compose-target-lang";
const STORAGE_KEY_USER_LANG = "mailflare-ai:compose-user-lang";

export function AiComposerModal({ isOpen, onClose, onApply, currentSubject }: AiComposerModalProps) {
	const { t, locale } = useLanguage();
	const [prompt, setPrompt] = useState("");
	const [targetLang, setTargetLang] = useState(() => (locale.startsWith("vi") ? "en" : "vi"));
	const [userLang, setUserLang] = useState(() => (locale.startsWith("vi") ? "vi" : "en"));
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ userVersion: string; replyBody: string } | null>(null);

	useEffect(() => {
		const savedTarget = localStorage.getItem(STORAGE_KEY_TARGET_LANG);
		if (savedTarget && COMMON_AI_LANGUAGES.some((l) => l.code === savedTarget)) {
			setTargetLang(savedTarget);
		}
		const savedUser = localStorage.getItem(STORAGE_KEY_USER_LANG);
		if (savedUser && COMMON_AI_LANGUAGES.some((l) => l.code === savedUser)) {
			setUserLang(savedUser);
		} else {
			setUserLang(locale.startsWith("vi") ? "vi" : "en");
		}
	}, [locale]);

	if (!isOpen) return null;

	function handleTargetLangChange(code: string) {
		setTargetLang(code);
		localStorage.setItem(STORAGE_KEY_TARGET_LANG, code);
	}

	function handleUserLangChange(code: string) {
		setUserLang(code);
		localStorage.setItem(STORAGE_KEY_USER_LANG, code);
	}

	async function handleGenerate() {
		if (!prompt.trim()) {
			setError(t("ai.composer.emptyPrompt"));
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await authFetch("/api/ai/compose-reply", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					emailContext: currentSubject ? `Subject: ${currentSubject}` : "",
					userPrompt: prompt,
					targetLanguage: targetLang,
					userLanguage: userLang,
				}),
			});

			const data = (await res.json()) as {
				userVersion?: string;
				replyBody?: string;
				error?: string;
			};

			if (!res.ok || data.error) {
				throw new Error(data.error || "Failed to generate draft");
			}

			setResult({
				userVersion: data.userVersion || "",
				replyBody: data.replyBody || "",
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error occurred");
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

	const targetLabel = getLanguageDisplayName(targetLang, locale);
	const userLabel = getLanguageDisplayName(userLang, locale);

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
			<div className="flex w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden max-h-[90vh]">
				{/* Header - Simple, clean, neutral */}
				<div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-neutral-600" />
						<h3 className="text-sm font-semibold text-neutral-900">
							{t("ai.composer.title")}
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
						aria-label={t("ai.close")}
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{/* Language Selectors */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/70">
						<div>
							<Label className="text-[11px] font-medium text-neutral-600">
								{t("ai.composer.readingLang")}
							</Label>
							<select
								value={userLang}
								onChange={(e) => handleUserLangChange(e.target.value)}
								className="mt-1 h-8 w-full rounded-lg border border-neutral-200 bg-white px-2 py-0 text-xs text-neutral-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-neutral-400"
							>
								{COMMON_AI_LANGUAGES.map((lang) => (
									<option key={lang.code} value={lang.code}>
										{locale.startsWith("vi") ? `${lang.label} (${lang.nativeName})` : lang.nativeName}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label className="text-[11px] font-medium text-blue-700">
								{t("ai.composer.sendingLang")}
							</Label>
							<select
								value={targetLang}
								onChange={(e) => handleTargetLangChange(e.target.value)}
								className="mt-1 h-8 w-full rounded-lg border border-blue-200 bg-white px-2 py-0 text-xs text-neutral-900 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-400"
							>
								{COMMON_AI_LANGUAGES.map((lang) => (
									<option key={lang.code} value={lang.code}>
										{locale.startsWith("vi") ? `${lang.label} (${lang.nativeName})` : lang.nativeName}
									</option>
								))}
							</select>
						</div>
					</div>

					<div>
						<Label className="text-xs font-medium text-neutral-700">
							{t("ai.composer.promptLabel")}
						</Label>
						<Textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder={t("ai.composer.promptPlaceholder")}
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
									{t("ai.composer.generating")}
								</>
							) : (
								t("ai.composer.generateButton", { lang: targetLabel })
							)}
						</Button>
					</div>

					{/* Dual View Result */}
					{result && (
						<div className="space-y-3 border-t border-neutral-100 pt-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{/* User Language Explanation / Preview */}
								<div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
									<div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-200/60">
										<span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
											{t("ai.composer.readingPreview", { lang: userLabel })}
										</span>
									</div>
									<div className="whitespace-pre-line text-xs text-neutral-700 leading-relaxed max-h-56 overflow-y-auto">
										{result.userVersion || ""}
									</div>
								</div>

								{/* Target Language Mail to Send */}
								<div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs">
									<div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100">
										<span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
											{t("ai.composer.sendingPreview", { lang: targetLabel })}
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
						{t("ai.composer.footerHint", { lang: targetLabel })}
					</p>
					<div className="flex items-center gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
							{t("ai.composer.cancel")}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={handleApply}
							disabled={!result?.replyBody}
							className="h-8 gap-1.5 rounded-lg text-xs"
						>
							<Check className="h-3.5 w-3.5" />
							{t("ai.composer.apply")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

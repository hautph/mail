"use client";

import { useEffect, useState } from "react";
import { FileText, Globe2, Loader2, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth/client";
import { useLanguage } from "@/components/language-provider";
import { COMMON_AI_LANGUAGES, getLanguageDisplayName } from "@/lib/ai/languages";

interface EmailAiAssistantProps {
	textBody: string | null;
	htmlBody: string | null;
	snippet?: string;
	subject?: string;
}

const STORAGE_KEY_LANG = "mailflare-ai:target-lang";

export function EmailAiAssistant({ textBody, htmlBody, snippet, subject }: EmailAiAssistantProps) {
	const { t, locale } = useLanguage();
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"summary" | "translate" | null>(null);
	const [targetLang, setTargetLang] = useState(() => (locale.startsWith("vi") ? "vi" : "en"));
	const [summary, setSummary] = useState<string | null>(null);
	const [translation, setTranslation] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY_LANG);
		if (saved && COMMON_AI_LANGUAGES.some((l) => l.code === saved)) {
			setTargetLang(saved);
		} else {
			setTargetLang(locale.startsWith("vi") ? "vi" : "en");
		}
	}, [locale]);

	const content = textBody || (htmlBody ? htmlBody.replace(/<[^>]+>/g, " ") : snippet || "");

	function handleLangChange(code: string) {
		setTargetLang(code);
		localStorage.setItem(STORAGE_KEY_LANG, code);
		setTranslation(null);
		setSummary(null);
	}

	async function handleSummarize() {
		if (summary) {
			setActiveTab("summary");
			setIsOpen(true);
			return;
		}

		if (!content.trim()) {
			setError(t("ai.emptyContent"));
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
				body: JSON.stringify({
					text: `Tiêu đề: ${subject || ""}\n\n${content}`,
					targetLang,
				}),
			});

			const data = (await res.json()) as { summary?: string; error?: string };
			if (!res.ok || data.error) {
				throw new Error(data.error || "Failed to summarize email");
			}

			setSummary(data.summary || "");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error occurred");
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
			setError(t("ai.emptyContent"));
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
				body: JSON.stringify({ text: content, targetLang }),
			});

			const data = (await res.json()) as { translated?: string; error?: string };
			if (!res.ok || data.error) {
				throw new Error(data.error || "Failed to translate email");
			}

			setTranslation(data.translated || "");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error occurred");
		} finally {
			setLoading(false);
		}
	}

	const selectedLangLabel = getLanguageDisplayName(targetLang, locale);

	return (
		<div className="mt-3 border-t border-neutral-100 pt-2">
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
					{t("ai.summary.button")}
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
					{t("ai.translate.button", { lang: selectedLangLabel })}
				</Button>

				<div className="flex items-center gap-1.5 text-xs text-neutral-500">
					<span>{t("ai.language.label")}</span>
					<select
						value={targetLang}
						onChange={(e) => handleLangChange(e.target.value)}
						className="h-8 rounded-lg border border-neutral-200 bg-white px-2 py-0 text-xs text-neutral-700 shadow-2xs hover:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400"
					>
						{COMMON_AI_LANGUAGES.map((lang) => (
							<option key={lang.code} value={lang.code}>
								{locale.startsWith("vi") ? `${lang.label} (${lang.nativeName})` : lang.nativeName}
							</option>
						))}
					</select>
				</div>

				{isOpen && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setIsOpen(false)}
						className="ml-auto h-7 px-2 text-xs text-neutral-400 hover:text-neutral-700"
					>
						{t("ai.close")}
					</Button>
				)}
			</div>

			{isOpen && (
				<div className="mt-2 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 text-sm text-neutral-800 transition-all">
					<div className="mb-2 flex items-center justify-between border-b border-neutral-200/60 pb-1.5">
						<span className="font-medium text-xs text-neutral-600 uppercase tracking-wider">
							{activeTab === "summary"
								? t("ai.summary.title", { lang: selectedLangLabel })
								: t("ai.translate.title", { lang: selectedLangLabel })}
						</span>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="text-neutral-400 hover:text-neutral-600"
							aria-label={t("ai.close")}
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					{loading ? (
						<div className="flex items-center gap-2 py-3 text-xs text-neutral-500">
							<Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
							<span>{t("ai.loading")}</span>
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

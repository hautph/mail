export interface SupportedAiLanguage {
	code: string;
	label: string;
	nativeName: string;
}

export const COMMON_AI_LANGUAGES: SupportedAiLanguage[] = [
	{ code: "vi", label: "Tiếng Việt", nativeName: "Tiếng Việt" },
	{ code: "en", label: "Tiếng Anh", nativeName: "English" },
	{ code: "zh-CN", label: "Tiếng Trung (Giản thể)", nativeName: "简体中文" },
	{ code: "ja", label: "Tiếng Nhật", nativeName: "日本語" },
	{ code: "ko", label: "Tiếng Hàn", nativeName: "한국어" },
	{ code: "fr", label: "Tiếng Pháp", nativeName: "Français" },
	{ code: "de", label: "Tiếng Đức", nativeName: "Deutsch" },
	{ code: "es", label: "Tiếng Tây Ban Nha", nativeName: "Español" },
	{ code: "ru", label: "Tiếng Nga", nativeName: "Русский" },
	{ code: "it", label: "Tiếng Ý", nativeName: "Italiano" },
	{ code: "th", label: "Tiếng Thái", nativeName: "ไทย" },
	{ code: "id", label: "Tiếng Indonesia", nativeName: "Bahasa Indonesia" },
];

export function getLanguageName(code: string): string {
	const found = COMMON_AI_LANGUAGES.find((lang) => lang.code === code);
	return found ? `${found.label} (${found.nativeName})` : code;
}

export function getLanguageDisplayName(code: string, currentLocale: string = "en"): string {
	const found = COMMON_AI_LANGUAGES.find((lang) => lang.code === code);
	if (!found) return code;
	if (currentLocale.startsWith("vi")) {
		return found.label;
	}
	return found.nativeName;
}

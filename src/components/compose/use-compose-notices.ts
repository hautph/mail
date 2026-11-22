import { clearMessageDetailCache } from "@/lib/messages/detail-cache";
import { authFetch } from "@/lib/auth/client";
import {
	DELIVERY_WAIT_MS,
	SCHEDULED_NOTICE_MS,
	SENT_NOTICE_MS,
	resolveSendNotice,
	splitSendTemplate,
} from "./send-notice-utils";
import type { SendNoticeParts, SendResult } from "./send-notice-utils";
import { formatScheduledSendTime } from "@/components/messages/scheduled-send-utils";
import { useRef } from "react";

type ShowNoticeFn = (
	message: string | null,
	options?: {
		tone?: "error" | "default";
		parts?: SendNoticeParts;
		durationMs?: number;
		countdown?: { endAt: number };
		onCountdownEnd?: () => void;
		poll?: {
			messageId: string;
			onStatus: (status: "sent" | "failed" | string) => void;
		};
		actions?: Array<{ label: string; onClick: () => void }>;
	},
) => number | undefined;

export function useComposeNotices({
	t,
	showNotice,
	openDraftComposer,
	isCurrentNotice,
}: {
	t: (key: string, values?: Record<string, unknown>) => string;
	showNotice: ShowNoticeFn;
	openDraftComposer: (id: string) => void;
	isCurrentNotice: (id: number) => boolean;
}) {
	const noticeActionInFlight = useRef(false);

	function buildSubjectNotice(
		key: "compose.sendingIn" | "compose.sendingSubject" | "compose.sentSubject",
		subjectLabel: string,
		messageId: string,
		countdown: boolean,
	): { message: string; parts: SendNoticeParts } {
		const template = t(key, { subject: "{subject}", seconds: "{seconds}" });
		const href = key === "compose.sentSubject" ? `/sent/${messageId}` : `/scheduled/${messageId}`;
		const parts: SendNoticeParts = {
			...splitSendTemplate(template, countdown),
			link: { label: subjectLabel, href },
		};
		return { message: t(key, { subject: subjectLabel, seconds: 1 }), parts };
	}

	function showSentNotice(messageId: string, subjectLabel: string, sourceNoticeId: number) {
		clearMessageDetailCache();
		window.dispatchEvent(new Event("mailflare:messages-changed"));
		if (!isCurrentNotice(sourceNoticeId)) return;
		const content = buildSubjectNotice("compose.sentSubject", subjectLabel, messageId, false);
		showNotice(content.message, { parts: content.parts, durationMs: SENT_NOTICE_MS });
	}

	function showSendingNotice(messageId: string, subjectLabel: string): number {
		const content = buildSubjectNotice("compose.sendingSubject", subjectLabel, messageId, false);
		let noticeId = 0;
		noticeId =
			showNotice(content.message, {
				parts: content.parts,
				durationMs: DELIVERY_WAIT_MS,
				poll: {
					messageId,
					onStatus: (status) => {
						if (status === "sent") {
							showSentNotice(messageId, subjectLabel, noticeId);
							return;
						}
						if (!isCurrentNotice(noticeId)) return;
						if (status === "failed") showNotice(t("compose.error.sendFailed"), { tone: "error" });
						else showNotice(null);
					},
				},
			}) ?? 0;
		return noticeId;
	}

	async function sendNow(messageId: string, subjectLabel: string, sourceNoticeId: number) {
		if (noticeActionInFlight.current) return;
		noticeActionInFlight.current = true;
		try {
			const response = await authFetch(`/api/messages/${messageId}/send-now`, { method: "POST" });
			if (response.ok) {
				showSentNotice(messageId, subjectLabel, sourceNoticeId);
				return;
			}
			if (!isCurrentNotice(sourceNoticeId)) return;
			if (response.status === 409 || response.status >= 500) {
				showSendingNotice(messageId, subjectLabel);
				return;
			}
			const result = (await response.json().catch(() => ({}))) as { error?: string };
			if (!isCurrentNotice(sourceNoticeId)) return;
			showNotice(result.error ?? t("compose.error.sendFailed"), { tone: "error" });
		} catch {
			if (isCurrentNotice(sourceNoticeId)) showSendingNotice(messageId, subjectLabel);
		} finally {
			noticeActionInFlight.current = false;
		}
	}

	async function cancelSend(messageId: string, source: "undo" | "scheduled", sourceNoticeId: number) {
		if (noticeActionInFlight.current) return;
		noticeActionInFlight.current = true;
		try {
			const res = await authFetch(`/api/messages/${messageId}/cancel-schedule`, { method: "POST" });
			if (!res.ok) {
				if (!isCurrentNotice(sourceNoticeId)) return;
				showNotice(
					source === "undo" && res.status === 409 ? t("compose.cancelTooLate") : t("schedule.cancelFailed"),
					{ tone: "error" },
				);
				return;
			}
			clearMessageDetailCache();
			window.dispatchEvent(new Event("mailflare:messages-changed"));
			if (!isCurrentNotice(sourceNoticeId)) return;
			showNotice(t("compose.sendCancelled"));
			openDraftComposer(messageId);
		} catch {
			if (isCurrentNotice(sourceNoticeId)) showNotice(t("schedule.cancelFailed"), { tone: "error" });
		} finally {
			noticeActionInFlight.current = false;
		}
	}

	function handleSendResultNotice(data: SendResult, subject: string) {
		const notice = resolveSendNotice(data);
		const subjectLabel = subject.trim() || t("list.noSubject");

		if (notice.kind === "undo") {
			const content = buildSubjectNotice("compose.sendingIn", subjectLabel, notice.messageId, true);
			let undoNoticeId = 0;
			undoNoticeId =
				showNotice(content.message, {
					parts: content.parts,
					durationMs: notice.durationMs,
					countdown: { endAt: notice.endAt },
					onCountdownEnd: () => {
						if (!isCurrentNotice(undoNoticeId) || noticeActionInFlight.current) return;
						showSendingNotice(notice.messageId, subjectLabel);
					},
					actions: [
						{ label: t("compose.undoSend"), onClick: () => cancelSend(notice.messageId, "undo", undoNoticeId) },
						{ label: t("compose.sendNow"), onClick: () => sendNow(notice.messageId, subjectLabel, undoNoticeId) },
					],
				}) ?? 0;
		} else if (notice.kind === "sending") {
			showSendingNotice(notice.messageId, subjectLabel);
		} else if (notice.kind === "scheduled") {
			const message = notice.scheduledAt
				? t("schedule.sendScheduledFor", { when: formatScheduledSendTime(notice.scheduledAt, t) })
				: t("compose.scheduled");
			let scheduledNoticeId = 0;
			scheduledNoticeId =
				showNotice(message, {
					durationMs: SCHEDULED_NOTICE_MS,
					actions: [
						{
							label: t("schedule.cancelSend"),
							onClick: () => cancelSend(notice.messageId, "scheduled", scheduledNoticeId),
						},
					],
				}) ?? 0;
		} else {
			showNotice(t("compose.sent"));
		}
	}

	return {
		handleSendResultNotice,
		showSendingNotice,
		showSentNotice,
		sendNow,
		cancelSend,
	};
}

import { Cloud, ExternalLink, ArrowDownToLine } from "@/components/icons";
import { MessageAttachmentCard } from "@/components/message-attachment-card";
import type { MessageAttachment } from "./types";

interface MessageAttachmentsSectionProps {
	messageId: string;
	attachments: MessageAttachment[];
	cloudAttachments: Array<{
		id: string;
		url: string;
		filename: string;
		provider: string;
	}>;
	onPreviewAttachment: (attachment: MessageAttachment) => void;
	onDownloadAllAttachments: () => Promise<void>;
	t: (key: string, values?: Record<string, unknown>) => string;
}

export function MessageAttachmentsSection({
	messageId,
	attachments,
	cloudAttachments,
	onPreviewAttachment,
	onDownloadAllAttachments,
	t,
}: MessageAttachmentsSectionProps) {
	return (
		<>
			{cloudAttachments.length > 0 && (
				<section className="mt-8 border-t border-neutral-100 px-4 py-6 sm:px-0 sm:pl-[78px]">
					<h2 className="mb-3 text-sm font-semibold text-neutral-900">
						{t("message.cloudFiles", { count: cloudAttachments.length })}
					</h2>
					<div className="grid gap-2 sm:grid-cols-2">
						{cloudAttachments.map((attachment) => (
							<a
								key={attachment.id}
								href={attachment.url}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:border-blue-200 hover:bg-blue-50/40"
							>
								<Cloud className="h-5 w-5 shrink-0 text-blue-600" />
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium text-neutral-900">
										{attachment.filename}
									</span>
									<span className="block text-xs text-neutral-500">
										{t("message.openFrom", { provider: attachment.provider })}
									</span>
								</span>
								<ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
								<span className="sr-only"> ({t("common.opensInNewTab")})</span>
							</a>
						))}
					</div>
				</section>
			)}
			{attachments.length > 0 && (
				<section className="mt-8 border-t border-neutral-100 px-4 py-6 sm:px-0 sm:pl-[78px]">
					<div className="mb-3 flex items-center justify-between gap-3">
						<h2 className="text-sm font-semibold text-neutral-900">
							{t("message.attachments", { count: attachments.length })}
						</h2>
						<button
							type="button"
							className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
							onClick={() => void onDownloadAllAttachments()}
						>
							<ArrowDownToLine className="h-3.5 w-3.5" />
							{t("attachment.downloadAll")}
						</button>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						{attachments.map((attachment) => (
							<MessageAttachmentCard
								key={attachment.id}
								attachment={attachment}
								messageId={messageId}
								onPreview={onPreviewAttachment}
							/>
						))}
					</div>
				</section>
			)}
		</>
	);
}

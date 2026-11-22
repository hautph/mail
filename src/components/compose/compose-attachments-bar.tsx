import { X, FileText } from "@/components/icons";
import { formatAttachmentSize } from "./utils";
import type { ComposeAttachment, ComposeStoredAttachment } from "./types";
import type { ComposeAttachmentPolicy } from "./attachment-policy-types";

interface ComposeAttachmentsBarProps {
	storedAttachments: ComposeStoredAttachment[];
	attachments: ComposeAttachment[];
	attachmentPolicy: ComposeAttachmentPolicy;
	onRemoveStored: (id: string) => void;
	onRemovePending: (id: string) => void;
	t: (key: string, values?: Record<string, unknown>) => string;
}

export function ComposeAttachmentsBar({
	storedAttachments,
	attachments,
	attachmentPolicy,
	onRemoveStored,
	onRemovePending,
	t,
}: ComposeAttachmentsBarProps) {
	if (attachments.length === 0 && storedAttachments.length === 0) {
		return null;
	}

	const hasLargeFiles = [...attachments.map((item) => item.file.size), ...storedAttachments.map((item) => item.size)].some(
		(size) => size > attachmentPolicy.cloudThresholdBytes,
	);

	return (
		<div>
			<div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto overflow-y-hidden px-3 py-2">
				{storedAttachments.map((attachment) => (
					<div
						key={attachment.id}
						className="flex max-w-full shrink-0 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 text-xs"
						title={t("compose.carriedOver")}
					>
						<FileText className="h-4 w-4 shrink-0 text-neutral-500" />
						<span className="max-w-48 truncate">{attachment.filename}</span>
						<span className="text-xs text-neutral-500">{formatAttachmentSize(attachment.size)}</span>
						<button
							type="button"
							onClick={() => onRemoveStored(attachment.id)}
							className="rounded-full p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
						>
							<X className="h-3.5 w-3.5" />
							<span className="sr-only">{t("compose.removeAttachment")}</span>
						</button>
					</div>
				))}
				{attachments.map((attachment) => (
					<div
						key={attachment.id}
						className="flex max-w-full shrink-0 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 text-xs"
					>
						<FileText className="h-4 w-4 shrink-0 text-neutral-500" />
						<span className="max-w-48 truncate font-medium">{attachment.file.name}</span>
						<span className="text-xs text-neutral-500">
							{formatAttachmentSize(attachment.file.size)}
						</span>
						<button
							type="button"
							onClick={() => onRemovePending(attachment.id)}
							className="rounded-full p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
						>
							<X className="h-3.5 w-3.5" />
							<span className="sr-only">{t("compose.removeAttachment")}</span>
						</button>
					</div>
				))}
			</div>
			<p className="px-3 pb-2 text-xs text-amber-700">
				{hasLargeFiles ? t("compose.cloudWarning.will") : t("compose.cloudWarning.may")}
			</p>
		</div>
	);
}

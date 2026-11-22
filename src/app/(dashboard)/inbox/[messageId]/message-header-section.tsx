import { ContactDetailsTrigger } from "@/components/contacts/contact-details";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { RecipientList } from "@/components/messages/recipient-list";
import { ThreadMessageActions } from "@/components/messages/thread-message-actions";
import { MessageUnsubscribeButton } from "@/components/messages/unsubscribe-button";
import type { MessageDetailResponse } from "./types";
import type { MessageAttachment } from "./types";

interface MessageHeaderSectionProps {
	message: NonNullable<MessageDetailResponse["message"]>;
	fromName: string;
	fromAddress: string;
	toEntries: string[];
	ccEntries: string[];
	bccEntries: string[];
	messageDate: (withTime: boolean) => string;
	canUnsubscribe: boolean;
	unsubBannerDismissed: boolean;
	showFullRecipientAddresses: boolean;
	detailsOpen: boolean;
	onToggleDetails: () => void;
	threadMessages: Array<{ id: string }>;
	currentThreadMessage: NonNullable<MessageDetailResponse["message"]> & {
		textBody: string | null;
		htmlBody: string | null;
		attachments: MessageAttachment[];
	};
	ownAddress: string;
	ownAddresses: string[];
	t: (key: string, values?: Record<string, unknown>) => string;
}

export function MessageHeaderSection({
	message,
	fromName,
	fromAddress,
	toEntries,
	ccEntries,
	bccEntries,
	messageDate,
	canUnsubscribe,
	unsubBannerDismissed,
	showFullRecipientAddresses,
	detailsOpen,
	onToggleDetails,
	threadMessages,
	currentThreadMessage,
	ownAddress,
	ownAddresses,
	t,
}: MessageHeaderSectionProps) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-4 pb-2 sm:px-0 sm:pl-[78px]">
			<div className="flex min-w-0 items-start gap-3">
				<ContactAvatar
					mailboxId={message.mailboxId}
					address={message.fromAddr}
					name={fromName}
					hasManagedAvatar={message.direction === "inbound"}
					managedAvatarUrl={
						message.direction === "outbound" && message.mailboxId
							? `/api/mailboxes/${message.mailboxId}/avatar`
							: undefined
					}
					className="mt-2 sm:-ml-12"
				/>
				<div className="flex-1 min-w-0">
					<p className="text-sm text-neutral-900 mt-1.25 flex flex-row items-center gap-1 w-full overflow-hidden">
						<b className="whitespace-nowrap">
							{message.direction === "inbound" ? (
								<ContactDetailsTrigger
									mailboxId={message.mailboxId}
									address={message.fromAddr}
									name={fromName}
								/>
							) : (
								fromName
							)}
						</b>{" "}
						<span className="hidden sm:block text-neutral-500 text-xs flex-1 overflow-hidden text-ellipsis min-w-0">
							&lt;{fromAddress}&gt;
						</span>
						{canUnsubscribe && unsubBannerDismissed && (
							<MessageUnsubscribeButton key={message.id} messageId={message.id} />
						)}
					</p>
					<p className="text-xs text-neutral-500">
						{t("source.to").toLowerCase()}{" "}
						<RecipientList
							entries={toEntries}
							mailboxId={message.mailboxId}
							style={showFullRecipientAddresses ? "full" : "address"}
						/>
					</p>
					<div className="sm:hidden flex items-center gap-2 text-xs text-neutral-500">
						<span>{messageDate(false)}</span>
					</div>
					{ccEntries.length > 0 && (
						<p className="text-xs text-neutral-500">
							{t("message.cc")}{" "}
							<RecipientList
								entries={ccEntries}
								mailboxId={message.mailboxId}
								style={showFullRecipientAddresses ? "full" : "address"}
							/>
						</p>
					)}
					{bccEntries.length > 0 && (
						<p className="text-xs text-neutral-500">
							{t("message.bcc")}{" "}
							<RecipientList
								entries={bccEntries}
								mailboxId={message.mailboxId}
								style={showFullRecipientAddresses ? "full" : "address"}
							/>
						</p>
					)}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<p className="hidden text-xs sm:block">{messageDate(true)}</p>
				<ThreadMessageActions
					message={currentThreadMessage}
					mailboxId={message.mailboxId}
					ownAddress={ownAddress}
					ownAddresses={ownAddresses}
					starOnly={
						!threadMessages.some((threadMessage) => threadMessage.id === message.id) ||
						!threadMessages.some((threadMessage) => threadMessage.id !== message.id)
					}
					detailsOpen={detailsOpen}
					onToggleDetails={onToggleDetails}
				/>
			</div>
		</div>
	);
}

"use client";
import { confirmDestructive } from "@/components/ui/confirm-dialog";

import { authFetch } from "@/lib/auth/client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { formatUserDate } from "@/lib/time/utils";
import { markMessageRead } from "@/components/mark-read";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { MessageActions } from "@/components/message-actions/message-actions";
import { MessageAttachmentViewer } from "@/components/message-attachment-viewer";
import { MessageInviteCard } from "@/components/message-invite-card";
import { MessageDetailSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePageLoading } from "@/components/page-loading";
import { PreviousMessage } from "@/components/previous-message";
import { ConversationThread } from "@/components/messages/conversation-thread";
import { getConversationSender } from "@/components/messages/conversation-thread-utils";
import { ConversationNotes } from "@/components/messages/conversation-notes";
import { ConversationNotesProvider } from "@/components/messages/conversation-notes-context";
import { MessageDetailNavigation } from "@/components/messages/message-detail-navigation";
import { MessageReadingHeaderButton } from "@/components/messages/message-reading-header-button";
import { ScheduledSendBanner } from "@/components/messages/scheduled-send-banner";
import { formatScheduledSendTime } from "@/components/messages/scheduled-send-utils";
import { QuotedEmailToggle } from "@/components/messages/quoted-email-toggle";
import { MessageDetailsPanel } from "@/components/messages/message-details-panel";
import { SenderCheckNotice } from "@/components/messages/sender-check-notice";
import { useMessageThread } from "@/components/messages/use-message-thread";
import { useLatestMessagesFirst } from "@/components/messages/use-latest-messages-first";
import { useMessageListVisibility } from "@/components/messages/message-list-visibility";
import { subscribePendingOverlay } from "@/lib/messages/field-store";
import { splitEmailAddressList } from "@/lib/email/address";
import { findInviteAttachment } from "@/lib/calendar/invite-attachment";
import { formatRecipientAddressList, type RecipientAddressStyle } from "@/lib/email/recipient-display";
import { useShowFullRecipientAddresses } from "@/components/messages/use-show-full-recipient-addresses";
import { EmailAiAssistant } from "@/components/messages/email-ai-assistant";
import { MessageHeaderSection } from "./message-header-section";
import { MessageAttachmentsSection } from "./message-attachments-section";
import type { MessageAttachment, MessageDetailResponse } from "./types";
import {
  fetchMessageDetail,
  fetchMessageMetadata,
  getCachedMessageDetailForDisplay,
  getMessageBodyDisplay,
  getMessageHeaderParties,
  getOwnAddressForMessage,
  resolveInlineAttachmentUrls,
} from "./utils";
import { extractCloudAttachments } from "./cloud-attachment-utils";
import { EmailHtmlRenderer } from "@/components/messages/email-html-renderer";
import { getEmailAddress } from "@/lib/email/address";
import { useRemoteContent } from "@/components/messages/use-remote-content";
import clsx from "clsx";
import { useAssistantOpen } from "@/components/agent/assistant-open-state";
import { useMessageContentScroll } from "./use-message-content-scroll";
import { useSendViewStatus } from "@/components/messages/use-send-view-status";
import { MailingListBanner } from "@/components/messages/mailing-list-banner";
import { useMailingListBanner } from "@/components/messages/use-mailing-list-banner";

const EMPTY_ATTACHMENTS: MessageAttachment[] = [];

export default function MessageDetailPage() {
  const params = useParams<{ messageId: string }>();
  return <MessageDetailContent key={params.messageId} messageId={params.messageId} />;
}

function MessageDetailContent({ messageId }: { messageId: string }) {
  const { t } = useLanguage();
  const { selectedMailbox, mailboxes } = useSelectedMailbox();
  const [data, setData] = useState<MessageDetailResponse | null>(
    () => getCachedMessageDetailForDisplay(messageId) ?? null,
  );
  useSendViewStatus(messageId, data?.scheduledAt);
  const [loading, setLoading] = useState(
    () => !getCachedMessageDetailForDisplay(messageId)?.message,
  );
  const [bodyPending, setBodyPending] = useState(() => {
    const cached = getCachedMessageDetailForDisplay(messageId);
    return !!cached?.message && !cached.body;
  });
  const [bodyError, setBodyError] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null);
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [latestMessagesFirst] = useLatestMessagesFirst();
  const { enabled: showFullRecipientAddresses } = useShowFullRecipientAddresses();
  const remote = useRemoteContent(
    data?.message ? getEmailAddress(data.message.fromAddr) : undefined,
    data?.message?.status === "spam",
  );
  const { visible: messageListVisible } = useMessageListVisibility();
  usePageLoading(loading, true);
  const thread = useMessageThread(messageId, data?.message?.threadId);
  const assistantVisible = useAssistantOpen();
  const { scrollRef, scrolled, handleScroll } = useMessageContentScroll(messageId, loading);
  const [unsubBannerDismissed, dismissUnsubBanner] = useMailingListBanner(messageId);
  const openingRead = useRef(false);

  function markMessageReadOnOpen(id: string) {
    if (openingRead.current) return;
    openingRead.current = true;
    void markMessageRead(id).finally(() => {
      openingRead.current = false;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadMessage() {
      const cachedData = getCachedMessageDetailForDisplay(messageId);
      if (cachedData?.message) {
        setData(cachedData);
        setLoading(false);
        if (!cachedData.message.read) markMessageReadOnOpen(cachedData.message.id);
        if (cachedData.body) {
          setBodyPending(false);
          if (cachedData.attachments !== undefined) return;
          try {
            const metadata = await fetchMessageMetadata(messageId);
            if (!cancelled) setData((current) => current ? { ...current, ...metadata } : current);
          } catch { /* Metadata is optional. */ }
          return;
        }
        setBodyPending(true);
        setBodyError(false);
        try {
          const full = await fetchMessageDetail(messageId, true);
          if (!cancelled) {
            setData(() => {
              if (openingRead.current && full.message) return { ...full, message: { ...full.message, read: true } };
              return full;
            });
            setBodyPending(false);
          }
        } catch {
          if (!cancelled) {
            setBodyPending(false);
            setBodyError(true);
          }
        }
        return;
      }
      setLoading(true);
      const nextData = await fetchMessageDetail(messageId).catch(() => fetchMessageDetail(messageId)).catch(() => ({ error: t("message.notFound") }));
      if (!cancelled) {
        setData(nextData);
        setLoading(false);
        if ("message" in nextData && nextData.message && !nextData.message.read) markMessageReadOnOpen(nextData.message.id);
      }
    }

    void loadMessage();
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  useEffect(() => {
    let cancelled = false;
    function syncCachedState() {
      const cached = getCachedMessageDetailForDisplay(messageId);
      if (!cached?.message) {
        void fetchMessageDetail(messageId, true).then((nextData) => {
          if (cancelled || !("message" in nextData) || !nextData.message) return;
          const nextMessage = nextData.message;
          setData((current) => {
            if (!current?.message) return nextData;
            const keepRead = openingRead.current;
            return { ...nextData, message: keepRead ? { ...nextMessage, read: true } : nextMessage };
          });
        }).catch(() => undefined);
        return;
      }
      const cachedMessage = cached.message;
      setData((current) => {
        if (!current?.message) return current;
        const next = {
          read: cachedMessage.read,
          starred: cachedMessage.starred,
          status: cachedMessage.status,
          folderId: cachedMessage.folderId,
          snoozedUntil: cachedMessage.snoozedUntil,
        };
        if (
          current.message.read === next.read
          && current.message.starred === next.starred
          && current.message.status === next.status
          && current.message.folderId === next.folderId
          && current.message.snoozedUntil === next.snoozedUntil
        ) return current;
        return { ...current, message: { ...current.message, ...next } };
      });
    }
    window.addEventListener("mailflare:messages-changed", syncCachedState);
    const unsubscribePending = subscribePendingOverlay(syncCachedState);
    return () => {
      cancelled = true;
      window.removeEventListener("mailflare:messages-changed", syncCachedState);
      unsubscribePending();
    };
  }, [messageId]);

  async function retryBody() {
    setBodyPending(true);
    setBodyError(false);
    try {
      const full = await fetchMessageDetail(messageId, true);
      setData(() => {
        if (openingRead.current && full.message) return { ...full, message: { ...full.message, read: true } };
        return full;
      });
      setBodyPending(false);
    } catch {
      setBodyPending(false);
      setBodyError(true);
    }
  }

  const message = data?.message;
  const body = data?.body;
  const attachments = data?.attachments ?? EMPTY_ATTACHMENTS;
  const scheduledAt = data?.scheduledAt;
  const messageMailbox =
    mailboxes.find((mailbox) => mailbox.id === message?.mailboxId) ?? selectedMailbox;
  const currentAccountName =
    messageMailbox?.displayName ?? messageMailbox?.localPart;
  const headerParties = message
    ? getMessageHeaderParties(message, currentAccountName)
    : null;
  const fromName = headerParties?.fromName ?? "";
  const fromAddress = headerParties?.fromAddress ?? "";
  const ownAddresses = messageMailbox
    ? messageMailbox.senderAddresses?.length
      ? messageMailbox.senderAddresses
      : [`${messageMailbox.localPart}@${messageMailbox.hostname}`]
    : [];
  const ownAddress = message ? getOwnAddressForMessage(message, ownAddresses) : "";
  const canUnsubscribe = message?.direction === "inbound" && message.status !== "spam" && !!message.hasUnsubscribe;
  const bodyDisplay = useMemo(
    () => getMessageBodyDisplay(body?.textBody, body?.htmlBody, message?.snippet, ownAddress),
    [body?.textBody, body?.htmlBody, message?.snippet, ownAddress],
  );
  const htmlBody = useMemo(
    () => resolveInlineAttachmentUrls(bodyDisplay.htmlBody, message?.id ?? "", attachments),
    [attachments, bodyDisplay.htmlBody, message?.id],
  );
  const quotedHtml = useMemo(
    () => resolveInlineAttachmentUrls(bodyDisplay.quotedHtml, message?.id ?? "", attachments),
    [attachments, bodyDisplay.quotedHtml, message?.id],
  );
  const cloudAttachmentResult = useMemo(
    () => extractCloudAttachments(bodyDisplay.latestContent),
    [bodyDisplay.latestContent],
  );
  const noteEmails = useMemo(() => {
    const style: RecipientAddressStyle = showFullRecipientAddresses ? "full" : "address";
    const emails = thread.messages.map((item) => ({
      id: item.id,
      sender: getConversationSender(item, currentAccountName),
      recipient: item.direction === "outbound" ? noteRecipient(item, style) : undefined,
      createdAt: item.createdAt,
    }));
    if (message && !emails.some((item) => item.id === message.id)) {
      emails.push({ id: message.id, sender: fromName, recipient: message.direction === "outbound" ? noteRecipient(message, style) : undefined, createdAt: message.createdAt });
    }
    return emails;
  }, [thread.messages, message, fromName, currentAccountName, showFullRecipientAddresses]);

  if (loading) {
    return <MessageDetailSkeleton />;
  }

  if (!message) {
    return (
      <p className="px-6 py-4 text-sm text-neutral-500">
        {data?.error ?? t("message.notFound")}
      </p>
    );
  }

  const currentThreadMessage = {
    ...message,
    textBody: body?.textBody ?? null,
    htmlBody: body?.htmlBody ?? null,
    attachments,
  };
  const toEntries = splitEmailAddressList(message.toAddr);
  const ccEntries = splitEmailAddressList(message.ccAddr);
  const bccEntries = splitEmailAddressList(message.bccAddr);
  const onDownloadAllAttachments = async () => {
    const url = `/api/messages/${message.id}/attachments.zip`;
    try {
      const response = await authFetch(url, { method: "HEAD" });
      if (response.status === 409 && !await confirmDestructive(t("attachment.downloadAllFlagged"))) return;
      window.location.assign(response.status === 409 ? `${url}?acknowledge=1` : url);
    } catch {
      window.location.assign(url);
    }
  };

  const messageDate = (withTime: boolean) => scheduledAt
    ? formatScheduledSendTime(scheduledAt, t)
    : formatUserDate(message.createdAt, withTime
      ? { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "2-digit", year: "numeric" });

  return (
    <ConversationNotesProvider key={message.threadId ?? message.id} messageId={message.id} emails={noteEmails}>
      <div className={clsx("flex py-2 h-12 items-center px-2 border-b sticky top-0 bg-white z-40 gap-3", scrolled ? "border-neutral-200" : "border-transparent")}>
        <MessageReadingHeaderButton assistantVisible={assistantVisible} />
        <MessageActions
          messageId={message.id}
          mailboxId={message.mailboxId}
          senderAddress={message.fromAddr}
          direction={message.direction}
          status={message.status}
          read={message.read}
          unsubscribeUrl={data.unsubscribeUrl ?? data.unsubscribeViaBody}
          subject={message.subject}
          bodyText={body?.textBody}
          ownAddress={ownAddress}
          ownAddresses={ownAddresses}
          message={message}
          messageMeta={message}
          bodyHtml={body?.htmlBody}
        />
        <MessageDetailNavigation messageId={message.id} unread={message.direction === "inbound" && !message.read} />
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain scrollbar-gutter-stable flex-1 min-h-0">
        <h1 className={clsx("sm:pl-[78px] px-4 pb-2 pt-2 text-2xl text-neutral-900 sm:pr-6")} title={message.subject ?? t("list.noSubject")}>
          {message.subject ?? t("list.noSubject")}
        </h1>
        <MessageInviteCard key={message.id} messageId={message.id} hasCalendarAttachment={!!findInviteAttachment(attachments)} className={clsx("sm:ml-[78px] mx-4 mb-3 sm:mr-6")} />
        <ConversationNotes className={clsx("sm:pl-[78px] px-4 sm:pr-6")} />
        <ConversationThread
          currentMessageId={message.id}
          position={latestMessagesFirst ? "after" : "before"}
          messages={thread.messages}
          mailboxId={message.mailboxId}
          currentAccountName={currentAccountName}
          ownAddress={ownAddress}
          ownAddresses={ownAddresses}
          latestMessagesFirst={latestMessagesFirst}
          showFullRecipientAddresses={showFullRecipientAddresses}
          expandedAll={threadExpanded}
          onExpandedAllChange={setThreadExpanded}
        />
        <article data-message-id={message.id} className={"pb-4 sm:pl-0 sm:pr-6"}>
          <div className="w-full">
            {canUnsubscribe && !unsubBannerDismissed && (
              <MailingListBanner messageId={message.id} onDismiss={dismissUnsubBanner} />
            )}
            <MessageHeaderSection
              message={message}
              fromName={fromName}
              fromAddress={fromAddress}
              toEntries={toEntries}
              ccEntries={ccEntries}
              bccEntries={bccEntries}
              messageDate={messageDate}
              canUnsubscribe={canUnsubscribe}
              unsubBannerDismissed={unsubBannerDismissed}
              showFullRecipientAddresses={showFullRecipientAddresses}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((open) => !open)}
              threadMessages={thread.messages}
              currentThreadMessage={currentThreadMessage}
              ownAddress={ownAddress}
              ownAddresses={ownAddresses}
              t={t}
            />

            <div className="px-4 sm:px-0 sm:pl-[78px] sm:pr-4 mb-3">
              <EmailAiAssistant
                textBody={body?.textBody ?? null}
                htmlBody={htmlBody ?? body?.htmlBody ?? null}
                snippet={message.snippet ?? ""}
                subject={message.subject}
              />
            </div>

            <SenderCheckNotice
              message={message}
              detailsOpen={detailsOpen}
              onViewDetails={() => setDetailsOpen((open) => !open)}
              announce
              className="mb-4 px-4 sm:px-0 sm:pl-[78px] sm:pr-4"
            />

            {detailsOpen && (
              <div className="mb-4 px-4 sm:px-0 sm:pl-[78px] sm:pr-4">
                <MessageDetailsPanel message={message} onClose={() => setDetailsOpen(false)} />
              </div>
            )}
            {scheduledAt && <div className="px-4 sm:px-0 sm:pl-[78px]"><ScheduledSendBanner messageId={message.id} scheduledAt={scheduledAt} onRescheduled={(next) => setData((current) => current ? { ...current, scheduledAt: next } : current)} /></div>}
            <div className="prose max-w-none px-4 text-neutral-900 sm:px-0 sm:pl-[78px]">
              {bodyError ? (
                <div role="alert" className="not-prose rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-700">{t("source.loadFailed")}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void retryBody()}>
                    {t("webhooks.retry")}
                  </Button>
                </div>
              ) : bodyPending ? (
                <div aria-busy="true" aria-label={t("common.loading")} className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : htmlBody ? (
                <EmailHtmlRenderer key={message.id} className="mx-auto" html={htmlBody} autoAllowRemote={remote.autoAllow} onAllowRemote={remote.allowSender} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text mx-auto">
                  {cloudAttachmentResult.content}
                </pre>
              )}
              {quotedHtml && <QuotedEmailToggle html={quotedHtml} autoAllowRemote={remote.autoAllow} onAllowRemote={remote.allowSender} />}
              {bodyDisplay.quotedContent.map((quotedContent) => (
                <PreviousMessage
                  key={`${quotedContent.dateLine}-${quotedContent.content.slice(0, 24)}`}
                  message={quotedContent}
                />
              ))}
            </div>

            <MessageAttachmentsSection
              messageId={message.id}
              attachments={attachments}
              cloudAttachments={cloudAttachmentResult.attachments}
              onPreviewAttachment={setPreviewAttachment}
              onDownloadAllAttachments={onDownloadAllAttachments}
              t={t}
            />
          </div>
        </article>
        <ConversationThread
          currentMessageId={message.id}
          position={latestMessagesFirst ? "before" : "after"}
          messages={thread.messages}
          mailboxId={message.mailboxId}
          currentAccountName={currentAccountName}
          ownAddress={ownAddress}
          ownAddresses={ownAddresses}
          latestMessagesFirst={latestMessagesFirst}
          showFullRecipientAddresses={showFullRecipientAddresses}
          expandedAll={threadExpanded}
          onExpandedAllChange={setThreadExpanded}
        />
        <MessageAttachmentViewer
          attachment={previewAttachment}
          messageId={message.id}
          open={previewAttachment !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewAttachment(null);
          }}
        />
      </div>
    </ConversationNotesProvider>
  );
}

function noteRecipient(message: { toAddr: string; ccAddr?: string | null }, style: RecipientAddressStyle): string | undefined {
  const recipients = [message.toAddr, message.ccAddr]
    .map((list) => formatRecipientAddressList(list, style))
    .filter(Boolean)
    .join(", ");
  return recipients || undefined;
}

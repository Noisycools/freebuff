import { SUBSCRIPTION_DISPLAY_NAME } from '@codebuff/common/constants/subscription-plans'
import { IS_FREEBUFF } from '../utils/constants'
import { pluralize } from '@codebuff/common/util/string'
import { TextAttributes } from '@opentui/core'
import React, { useCallback, useMemo } from 'react'

import { CopyButton } from './copy-button'
import { ElapsedTimer } from './elapsed-timer'
import { FeedbackIconButton } from './feedback-icon-button'
import { RunSummaryBlock } from './run-summary-block'
import { useSubscriptionQuery } from '../hooks/use-subscription-query'
import {
  extractChecksFromBlocks,
  extractFilesChangedFromBlocks,
  extractUnresolvedRisksFromMessage,
} from '../utils/run-summary'
import {
  getBlockPercentRemaining,
  isCoveredBySubscription,
} from '../utils/subscription'
import { useTheme } from '../hooks/use-theme'
import {
  useFeedbackStore,
  selectIsFeedbackOpenForMessage,
  selectHasSubmittedFeedback,
  selectMessageFeedbackCategory,
} from '../state/feedback-store'

import type { ContentBlock, TextContentBlock } from '../types/chat'

interface MessageFooterProps {
  messageId: string
  blocks?: ContentBlock[]
  content: string
  isLoading: boolean
  isComplete?: boolean
  completionTime?: string
  credits?: number
  timerStartTime: number | null
  onFeedback?: (messageId: string) => void
  onCloseFeedback?: () => void
}

export const MessageFooter: React.FC<MessageFooterProps> = ({
  messageId,
  blocks,
  content,
  isLoading,
  isComplete,
  completionTime,
  credits,
  timerStartTime,
  onFeedback,
  onCloseFeedback,
}) => {
  const theme = useTheme()

  // Run-end outcome block (specs/tickets.md, C1), derived from the same
  // tool-call records that feed the persisted sidecar. Recomputed on render
  // of a completed message rather than rehydrated, so a restored chat shows
  // the same summary without carrying a second copy of the data in memory.
  const runSummary = useMemo(() => {
    if (!isComplete) return null
    const filesChanged = extractFilesChangedFromBlocks(blocks)
    const checks = extractChecksFromBlocks(blocks)
    const unresolvedRisks = extractUnresolvedRisksFromMessage({
      id: messageId,
      variant: 'ai',
      content,
      blocks,
      timestamp: '',
      isComplete: true,
    })
    const hasAnything =
      filesChanged.length > 0 ||
      checks.length > 0 ||
      unresolvedRisks.length > 0
    return hasAnything ? { filesChanged, checks, unresolvedRisks } : null
  }, [isComplete, blocks, content, messageId])

  // Memoize selectors to prevent new function references on every render
  const selectIsFeedbackOpenMemo = useMemo(
    () => selectIsFeedbackOpenForMessage(messageId),
    [messageId],
  )
  const selectHasSubmittedFeedbackMemo = useMemo(
    () => selectHasSubmittedFeedback(messageId),
    [messageId],
  )
  const selectMessageFeedbackCategoryMemo = useMemo(
    () => selectMessageFeedbackCategory(messageId),
    [messageId],
  )

  const isFeedbackOpen = useFeedbackStore(selectIsFeedbackOpenMemo)
  const hasSubmittedFeedback = useFeedbackStore(selectHasSubmittedFeedbackMemo)
  const selectedFeedbackCategory = useFeedbackStore(
    selectMessageFeedbackCategoryMemo,
  )

  const shouldShowLoadingTimer = isLoading && !isComplete
  const shouldShowCompletionFooter = isComplete
  const canRequestFeedback = shouldShowCompletionFooter && !hasSubmittedFeedback
  const isGoodOrBadSelection =
    selectedFeedbackCategory === 'good_result' ||
    selectedFeedbackCategory === 'bad_result'
  const shouldShowSubmittedFeedbackState =
    shouldShowCompletionFooter && hasSubmittedFeedback && isGoodOrBadSelection
  const shouldRenderFeedbackButton =
    Boolean(onFeedback) &&
    (canRequestFeedback || shouldShowSubmittedFeedbackState)

  const handleFeedbackOpen = useCallback(() => {
    if (!canRequestFeedback || !onFeedback) return
    onFeedback(messageId)
  }, [canRequestFeedback, onFeedback, messageId])

  const handleFeedbackClose = useCallback(() => {
    if (!canRequestFeedback) return
    onCloseFeedback?.()
  }, [canRequestFeedback, onCloseFeedback])

  // Build text from content and text blocks for copy button
  const textToCopy = [
    content,
    ...(blocks || [])
      .filter((b): b is TextContentBlock => b.type === 'text')
      .map((b) => b.content),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim()

  // Loading timer
  if (shouldShowLoadingTimer) {
    return (
      <text
        attributes={TextAttributes.DIM}
        style={{
          wrapMode: 'none',
          marginTop: 0,
          marginBottom: 0,
          alignSelf: 'flex-end',
        }}
      >
        <ElapsedTimer
          startTime={timerStartTime}
          attributes={TextAttributes.DIM}
        />
      </text>
    )
  }

  // Completion footer
  if (!shouldShowCompletionFooter) {
    return null
  }

  const footerItems: { key: string; node: React.ReactNode }[] = []

  // Add copy button first if there's content to copy
  if (textToCopy.length > 0) {
    footerItems.push({
      key: 'copy',
      node: (
        <CopyButton
          textToCopy={textToCopy}
          leadingSpace={false}
          style={{ wrapMode: 'none' }}
        />
      ),
    })
  }

  if (completionTime) {
    footerItems.push({
      key: 'time',
      node: (
        <text
          attributes={TextAttributes.DIM}
          style={{
            wrapMode: 'none',
            fg: theme.secondary,
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          {completionTime}
        </text>
      ),
    })
  }
  if (typeof credits === 'number' && credits > 0 && !IS_FREEBUFF) {
    footerItems.push({
      key: 'credits',
      node: <CreditsOrSubscriptionIndicator credits={credits} />,
    })
  }
  if (shouldRenderFeedbackButton) {
    footerItems.push({
      key: 'feedback',
      node: (
        <FeedbackIconButton
          onClick={handleFeedbackOpen}
          onClose={handleFeedbackClose}
          isOpen={canRequestFeedback ? isFeedbackOpen : false}
          messageId={messageId}
          selectedCategory={selectedFeedbackCategory}
          hasSubmittedFeedback={hasSubmittedFeedback}
        />
      ),
    })
  }

  if (footerItems.length === 0) {
    return null
  }

  // When the run changed files or ran checks, wrap the footer row and the
  // outcome block in a column so the summary lines sit above the timestamp/
  // feedback row instead of beside it.
  const footerRow = (
    <box
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 1,
      }}
    >
      {footerItems.map((item, idx) => (
        <React.Fragment key={item.key}>
          {idx > 0 && (
            <text
              attributes={TextAttributes.DIM}
              style={{
                wrapMode: 'none',
                fg: theme.muted,
                marginTop: 0,
                marginBottom: 0,
              }}
            >
              •
            </text>
          )}
          {item.node}
        </React.Fragment>
      ))}
    </box>
  )

  if (!runSummary) {
    return footerRow
  }

  return (
    <box
      style={{
        flexDirection: 'column',
        width: '100%',
        marginTop: 0,
        marginBottom: 0,
      }}
    >
      <RunSummaryBlock
        filesChanged={runSummary.filesChanged}
        checks={runSummary.checks}
        unresolvedRisks={runSummary.unresolvedRisks}
      />
      {footerRow}
    </box>
  )
}

const CreditsOrSubscriptionIndicator: React.FC<{ credits: number }> = ({ credits }) => {
  const theme = useTheme()
  const { data: subscriptionData } = useSubscriptionQuery({
    refetchInterval: false,
    refetchOnActivity: false,
    pauseWhenIdle: false,
  })

  const blockPercentRemaining = useMemo(
    () => getBlockPercentRemaining(subscriptionData),
    [subscriptionData],
  )

  const showSubscriptionIndicator = isCoveredBySubscription(subscriptionData)

  if (showSubscriptionIndicator) {
    const label = (blockPercentRemaining ?? 0) < 20
      ? `✓ ${SUBSCRIPTION_DISPLAY_NAME} (${blockPercentRemaining}% left)`
      : `✓ ${SUBSCRIPTION_DISPLAY_NAME}`
    return (
      <text
        attributes={TextAttributes.DIM}
        style={{ wrapMode: 'none', fg: theme.success, marginTop: 0, marginBottom: 0 }}
      >
        {label}
      </text>
    )
  }

  return (
    <text
      attributes={TextAttributes.DIM}
      style={{ wrapMode: 'none', fg: theme.secondary, marginTop: 0, marginBottom: 0 }}
    >
      {pluralize(credits, 'credit')}
    </text>
  )
}

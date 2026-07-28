import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react'

const RATE_LIMIT_MS = 60_000

export type FeedbackRating = 'up' | 'down' | null

export interface HelpArticleFeedbackProps {
  articleId?: string
  onSubmit?: (rating: FeedbackRating, comment: string) => void
}

export default function HelpArticleFeedback({
  articleId = 'help-article',
  onSubmit,
}: HelpArticleFeedbackProps) {
  const [rating, setRating] = useState<FeedbackRating>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (rating === 'down' && commentRef.current) {
      commentRef.current.focus()
    }
  }, [rating])

  useEffect(() => {
    if (submitted && statusRef.current) {
      statusRef.current.focus()
    }
  }, [submitted])

  const handleThumbsClick = useCallback(
    (value: 'up' | 'down') => {
      if (submitted) return
      setError(null)
      setRating(value)
    },
    [submitted],
  )

  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setComment(e.target.value)
      if (error) setError(null)
    },
    [error],
  )

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (rating === null) return

      const now = Date.now()
      if (now - lastSubmitTime < RATE_LIMIT_MS) {
        setError('Please wait before submitting another response.')
        return
      }

      if (rating === 'down' && comment.trim().length > 500) {
        setError('Comment must be 500 characters or fewer.')
        return
      }

      setLastSubmitTime(now)
      setSubmitted(true)
      onSubmit?.(rating, comment.trim())
    },
    [rating, comment, lastSubmitTime, onSubmit],
  )

  const handleReset = useCallback(() => {
    setRating(null)
    setComment('')
    setSubmitted(false)
    setError(null)
  }, [])

  return (
    <section
      className="help-feedback"
      aria-labelledby="help-feedback-heading"
      data-article-id={articleId}
    >
      <h3 id="help-feedback-heading" className="help-feedback-heading">
        Was this helpful?
      </h3>

      {submitted ? (
        <div
          ref={statusRef}
          className="help-feedback-thanks"
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          <span className="help-feedback-thanks-icon" aria-hidden="true">✓</span>
          <p className="help-feedback-thanks-text">Thanks for your feedback!</p>
          <button
            type="button"
            className="help-feedback-reset"
            onClick={handleReset}
            aria-label="Submit different feedback"
          >
            Submit different feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="help-feedback-form" noValidate>
          <div className="help-feedback-buttons" role="group" aria-label="Rate this article">
            <button
              type="button"
              className={`help-feedback-btn${rating === 'up' ? ' help-feedback-btn-active' : ''}`}
              aria-pressed={rating === 'up'}
              aria-label="This article was helpful"
              onClick={() => handleThumbsClick('up')}
              disabled={submitted}
            >
              <span className="help-feedback-btn-icon" aria-hidden="true">👍</span>
              <span className="help-feedback-btn-label">Helpful</span>
            </button>
            <button
              type="button"
              className={`help-feedback-btn${rating === 'down' ? ' help-feedback-btn-active' : ''}`}
              aria-pressed={rating === 'down'}
              aria-label="This article was not helpful"
              onClick={() => handleThumbsClick('down')}
              disabled={submitted}
            >
              <span className="help-feedback-btn-icon" aria-hidden="true">👎</span>
              <span className="help-feedback-btn-label">Not helpful</span>
            </button>
          </div>

          {rating === 'down' && (
            <div className="help-feedback-comment">
              <label htmlFor="help-feedback-comment" className="help-feedback-comment-label">
                Any additional thoughts? <span className="help-feedback-optional">(optional)</span>
              </label>
              <textarea
                ref={commentRef}
                id="help-feedback-comment"
                className="help-feedback-textarea"
                rows={3}
                maxLength={500}
                value={comment}
                onChange={handleCommentChange}
                placeholder="Tell us how we can improve this article…"
                aria-describedby="help-feedback-comment-hint"
              />
              <div id="help-feedback-comment-hint" className="help-feedback-hint">
                {comment.length}/500 characters
              </div>
            </div>
          )}

          {error && (
            <div className="help-feedback-error" role="alert">
              {error}
            </div>
          )}

          {rating !== null && (
            <button
              type="submit"
              className="help-feedback-submit"
              disabled={submitted}
            >
              Submit feedback
            </button>
          )}
        </form>
      )}
    </section>
  )
}
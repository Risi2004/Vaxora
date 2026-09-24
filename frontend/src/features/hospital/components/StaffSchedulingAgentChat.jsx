import React, { useEffect, useMemo, useRef, useState } from 'react';
import agentService from '../../patient/services/agentService';
import staffService from '../services/staffService';

const formatMarkdownText = (text, isUser = false) => {
  if (!text) return '';

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} style={{ height: '6px' }} />;
    }

    const isBullet = trimmed.startsWith('- ') || (trimmed.startsWith('* ') && !trimmed.startsWith('**'));
    if (isBullet) {
      trimmed = trimmed.substring(2).trim();
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    let itemNumber = null;
    if (numMatch) {
      itemNumber = numMatch[1];
      trimmed = numMatch[2];
    }

    const parts = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(trimmed)) !== null) {
      if (match.index > lastIndex) {
        parts.push(trimmed.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`${lineIdx}-${match.index}`} style={{ fontWeight: 700, color: isUser ? '#ffffff' : '#0f172a' }}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={`${lineIdx}-${match.index}`}
            style={{
              background: isUser ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '0.88em',
              fontFamily: 'monospace',
            }}
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={`${lineIdx}-${match.index}`}>{token.slice(1, -1)}</em>);
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < trimmed.length) {
      parts.push(trimmed.substring(lastIndex));
    }

    if (isBullet) {
      return (
        <div
          key={lineIdx}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '3px 0', paddingLeft: '4px' }}
        >
          <span style={{ color: isUser ? '#ffffff' : '#0284c7', fontSize: '9px', marginTop: '6px' }}>●</span>
          <div style={{ flex: 1 }}>{parts}</div>
        </div>
      );
    }

    if (itemNumber) {
      return (
        <div
          key={lineIdx}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '3px 0', paddingLeft: '4px' }}
        >
          <span style={{ fontWeight: 700, color: isUser ? '#ffffff' : '#0284c7', fontSize: '13px' }}>
            {itemNumber}.
          </span>
          <div style={{ flex: 1 }}>{parts}</div>
        </div>
      );
    }

    return (
      <div key={lineIdx} style={{ margin: '2px 0' }}>
        {parts}
      </div>
    );
  });
};

function normalizeTime(value) {
  const s = String(value || '').trim();
  if (s.length === 5) return `${s}:00`;
  return s;
}

function proposalIdentity(p) {
  return `${p.affiliationId}|${String(p.shiftDate).slice(0, 10)}|${p.startTime}|${p.endTime}`;
}

/**
 * Staff Scheduling Agent chat — UI aligned with BookingAgentChat.
 */
export default function StaffSchedulingAgentChat({ weekStart, weekEnd, initialPrompt, onShiftsChanged, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your **Vaxora Staff Scheduling Agent**.\n\nI can help you:\n- Review active doctors and nurses\n- Check weekly coverage gaps (Low / Partial / Good)\n- Suggest shifts for low-coverage days\n- Propose changes that require **your approval** before anything is saved\n\nHow can I help with this week’s roster?',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentHealth, setAgentHealth] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const [followUpPrompts, setFollowUpPrompts] = useState([]);

  const defaultPrompts = useMemo(
    () => [
      `Check coverage from ${weekStart} to ${weekEnd}`,
      `Suggest shifts for low coverage from ${weekStart} to ${weekEnd}`,
      'List my active staff',
      'Who can cover low days this week?',
    ],
    [weekStart, weekEnd]
  );

  const chipPrompts = followUpPrompts.length > 0 ? followUpPrompts : defaultPrompts;

  useEffect(() => {
    setFollowUpPrompts([]);
  }, [weekStart, weekEnd]);

  useEffect(() => {
    let mounted = true;
    agentService.checkHealth().then((status) => {
      if (mounted) {
        setAgentHealth(status);
        setCheckingHealth(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    stickToBottomRef.current = true;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await agentService.sendMessage(newMessages, {
        targetAgent: 'StaffSchedulingAgent',
      });

      const proposals = Array.isArray(res.proposals)
        ? res.proposals
        : res.proposal
          ? [res.proposal]
          : [];

      const nextFollowUps = Array.isArray(res.suggestedFollowUps)
        ? res.suggestedFollowUps.filter((p) => typeof p === 'string' && p.trim())
        : Array.isArray(res.suggested_follow_ups)
          ? res.suggested_follow_ups.filter((p) => typeof p === 'string' && p.trim())
          : [];
      if (nextFollowUps.length > 0) {
        setFollowUpPrompts(nextFollowUps);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.content || 'I processed your scheduling request.',
          proposals,
          workflowId: res.workflowId || res.WorkflowId || null,
          createdShifts: res.created_shifts || res.createdShifts || null,
        },
      ]);

      if ((res.created_shifts || res.createdShifts)?.length && onShiftsChanged) {
        onShiftsChanged();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Agent Communication Error**: ${
            err.message ||
            'Could not connect to the Staff Scheduling Agent service. Please ensure the agent backend is running.'
          }`,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!initialPrompt || autoSentRef.current) return;
    autoSentRef.current = true;
    handleSendMessage(initialPrompt);
    // Suggest Week opens the chat and sends this prompt once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleApproveProposal = async (proposal, workflowId, remainingCount) => {
    const id = proposalIdentity(proposal);
    stickToBottomRef.current = false;
    setApprovingId(id);
    try {
      await staffService.createShift({
        affiliationId: proposal.affiliationId,
        shiftDate: String(proposal.shiftDate).slice(0, 10),
        startTime: normalizeTime(proposal.startTime),
        endTime: normalizeTime(proposal.endTime),
        boothOrStation: proposal.boothOrStation || null,
        notes: proposal.notes || 'Approved via Staff Scheduling Agent',
      });

      if (workflowId && remainingCount <= 1) {
        try {
          await agentService.recordDecision(workflowId, {
            approved: true,
            note: 'Approved shift proposal(s) from agent run',
          });
        } catch (decisionErr) {
          console.warn('Failed to persist workflow approval:', decisionErr);
        }
      }

      // Keep scroll position: mark approved in-place, do not append a new chat bubble.
      setMessages((prev) =>
        prev.map((msg) => {
          if (!Array.isArray(msg.proposals) || msg.proposals.length === 0) return msg;
          if (workflowId && msg.workflowId !== workflowId) return msg;
          const nextProposals = msg.proposals.map((p) =>
            proposalIdentity(p) === id ? { ...p, _status: 'approved' } : p
          );
          const pending = nextProposals.filter((p) => p._status !== 'approved' && p._status !== 'declined');
          return {
            ...msg,
            proposals: nextProposals,
            approvedCount: (msg.approvedCount || 0) + 1,
            decision: pending.length === 0 ? 'Approved' : msg.decision,
          };
        })
      );

      if (onShiftsChanged) onShiftsChanged();
    } catch (err) {
      stickToBottomRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to create shift: ${err.message || 'Request failed'}`,
          isError: true,
        },
      ]);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeclineProposal = async (proposal, workflowId, remainingCount, approvedCount = 0) => {
    const id = proposalIdentity(proposal);
    stickToBottomRef.current = false;

    const pendingLeft = remainingCount - 1;
    if (workflowId && pendingLeft <= 0) {
      try {
        await agentService.recordDecision(workflowId, {
          approved: approvedCount > 0,
          note:
            approvedCount > 0
              ? 'Accepted some proposals and declined the rest'
              : 'Declined shift proposal(s)',
        });
      } catch (decisionErr) {
        console.warn('Failed to persist workflow rejection:', decisionErr);
      }
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (!Array.isArray(msg.proposals) || msg.proposals.length === 0) return msg;
        if (workflowId && msg.workflowId !== workflowId) return msg;
        const nextProposals = msg.proposals.map((p) =>
          proposalIdentity(p) === id ? { ...p, _status: 'declined' } : p
        );
        const pending = nextProposals.filter((p) => p._status !== 'approved' && p._status !== 'declined');
        return {
          ...msg,
          proposals: nextProposals,
          decision:
            pending.length === 0
              ? approvedCount > 0
                ? 'Approved'
                : 'Rejected'
              : msg.decision,
        };
      })
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '620px',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Header — same pattern as BookingAgentChat */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Vaxora Staff Scheduling Agent</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
              Coverage · Shift proposals · Human approval required
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: agentHealth?.online ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${agentHealth?.online ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: agentHealth?.online ? '#22c55e' : '#ef4444',
                display: 'inline-block',
              }}
            />
            {checkingHealth ? 'Checking Agent...' : agentHealth?.online ? 'Agent Online' : 'Agent Offline'}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Scheduling Agent"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '8px',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '14px 18px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? '#0284c7' : msg.isError ? '#fef2f2' : '#ffffff',
                  color: isUser ? '#ffffff' : msg.isError ? '#991b1b' : '#1e293b',
                  border: isUser ? 'none' : msg.isError ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  boxShadow: isUser
                    ? '0 2px 8px rgba(2, 132, 199, 0.2)'
                    : '0 2px 6px rgba(0, 0, 0, 0.04)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              >
                {formatMarkdownText(msg.content, isUser)}
              </div>

              {Array.isArray(msg.proposals) && msg.proposals.length > 0 && (
                <div
                  style={{
                    maxWidth: '95%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginTop: '2px',
                  }}
                >
                  {msg.proposals.map((proposal) => {
                    const id = proposalIdentity(proposal);
                    const status = proposal._status;
                    const resolved = status === 'approved' || status === 'declined';
                    const station = proposal.boothOrStation
                      ? String(proposal.boothOrStation).replace(/\s*[—–-]\s*/g, ' · ')
                      : null;

                    if (resolved) {
                      return (
                        <div
                          key={id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${status === 'approved' ? '#86efac' : '#e2e8f0'}`,
                            background: status === 'approved' ? '#f0fdf4' : '#f8fafc',
                            fontSize: '12px',
                            color: status === 'approved' ? '#15803d' : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          <span>{status === 'approved' ? '✓' : '✕'}</span>
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proposal.staffName} · {String(proposal.shiftDate).slice(0, 10)} ·{' '}
                            {String(proposal.startTime).slice(0, 5)}–{String(proposal.endTime).slice(0, 5)}
                          </span>
                          <span>{status === 'approved' ? 'Created' : 'Declined'}</span>
                        </div>
                      );
                    }

                    const pendingCount = msg.proposals.filter(
                      (p) => p._status !== 'approved' && p._status !== 'declined'
                    ).length;

                    return (
                      <div
                        key={id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          background: '#ffffff',
                          border: '1px solid #7dd3fc',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          color: '#0f172a',
                        }}
                      >
                        <div style={{ flex: '1 1 180px', minWidth: 0, lineHeight: 1.35 }}>
                          <div style={{ fontWeight: 700, color: '#0369a1' }}>
                            {proposal.staffName}
                            {proposal.staffRole ? (
                              <span style={{ fontWeight: 500, color: '#64748b' }}> · {proposal.staffRole}</span>
                            ) : null}
                          </div>
                          <div style={{ color: '#475569' }}>
                            {String(proposal.shiftDate).slice(0, 10)} ·{' '}
                            {String(proposal.startTime).slice(0, 5)}–{String(proposal.endTime).slice(0, 5)}
                            {station ? ` · ${station}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeclineProposal(
                                proposal,
                                msg.workflowId,
                                pendingCount,
                                msg.approvedCount || 0
                              )
                            }
                            disabled={isLoading || approvingId !== null}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#64748b',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleApproveProposal(proposal, msg.workflowId, pendingCount)
                            }
                            disabled={isLoading || approvingId !== null}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#16a34a',
                              color: '#ffffff',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {approvingId === id ? '…' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {msg.decision &&
                Array.isArray(msg.proposals) &&
                msg.proposals.every((p) => p._status === 'approved' || p._status === 'declined') && (
                <div
                  style={{
                    maxWidth: '90%',
                    background: msg.decision === 'Approved' ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${msg.decision === 'Approved' ? '#86efac' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    marginTop: '2px',
                    fontSize: '11px',
                    color: '#475569',
                    fontWeight: 600,
                  }}
                >
                  Batch {msg.decision.toLowerCase()}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#64748b',
              fontSize: '13px',
              fontStyle: 'italic',
              padding: '8px 0',
            }}
          >
            <span>⏳</span> Agent is thinking & checking staff coverage...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isLoading && (
        <div
          style={{
            padding: '10px 16px',
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {chipPrompts.map((prompt, i) => (
            <button
              key={`${i}-${prompt}`}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              style={{
                whiteSpace: 'nowrap',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          padding: '14px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <textarea
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about coverage, staff, or request shift suggestions..."
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '14px',
            fontFamily: 'inherit',
            maxHeight: '80px',
          }}
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputMessage.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            background: isLoading || !inputMessage.trim() ? '#94a3b8' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s',
          }}
        >
          <span>Send</span>
          <span>🚀</span>
        </button>
      </div>
    </div>
  );
}

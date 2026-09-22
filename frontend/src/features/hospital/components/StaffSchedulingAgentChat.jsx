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
          <span style={{ color: isUser ? '#ffffff' : '#19469d', fontSize: '9px', marginTop: '6px' }}>●</span>
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
          <span style={{ fontWeight: 700, color: isUser ? '#ffffff' : '#19469d', fontSize: '13px' }}>
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
 * Hospital Staff Scheduling Agent chat.
 * Uses targetAgent=StaffSchedulingAgent; Approve creates shifts via hospital API.
 */
export default function StaffSchedulingAgentChat({ weekStart, weekEnd, onShiftsChanged, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello — I am the **Vaxora Staff Scheduling Agent**.\n\nI can help you:\n- Review active doctors and nurses\n- Check weekly coverage gaps\n- Suggest shifts for low-coverage days\n- Propose changes that **you** must approve before anything is saved\n\nAsk me about this week’s coverage, or use a suggested prompt below.',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentHealth, setAgentHealth] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = useMemo(
    () => [
      `Check coverage from ${weekStart} to ${weekEnd}`,
      `Suggest shifts for low coverage from ${weekStart} to ${weekEnd}`,
      'List my active staff',
      'Who is free to cover low days this week?',
    ],
    [weekStart, weekEnd]
  );

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await agentService.sendMessage(newMessages, {
        targetAgent: 'StaffSchedulingAgent',
      });

      const proposals = Array.isArray(res.proposals) ? res.proposals : res.proposal ? [res.proposal] : [];

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.content || 'I processed your scheduling request.',
          proposals,
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
          content: `**Agent Communication Error**: ${
            err.message ||
            'Could not connect to the Staff Scheduling Agent. Start the agent service on port 8001 and ensure your LLM endpoint is configured.'
          }`,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveProposal = async (proposal) => {
    const id = proposalIdentity(proposal);
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

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Approved and created shift for **${proposal.staffName}** on **${String(proposal.shiftDate).slice(0, 10)}** (${String(proposal.startTime).slice(0, 5)}–${String(proposal.endTime).slice(0, 5)}).`,
        },
      ]);

      if (onShiftsChanged) onShiftsChanged();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Failed to create shift: ${err.message || 'Request failed'}`,
          isError: true,
        },
      ]);
    } finally {
      setApprovingId(null);
    }
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
      <div
        style={{
          background: 'linear-gradient(135deg, #19469d 0%, #0f2f6b 100%)',
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
            🗓️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Staff Scheduling Agent</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
              Coverage · Suggest shifts · Human approval required
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
            {checkingHealth
              ? 'Checking Agent...'
              : agentHealth?.online
                ? 'Agent Online (8001)'
                : 'Agent Offline'}
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
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

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
                  background: isUser ? '#19469d' : msg.isError ? '#fef2f2' : '#ffffff',
                  color: isUser ? '#ffffff' : msg.isError ? '#991b1b' : '#1e293b',
                  border: isUser ? 'none' : msg.isError ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              >
                {formatMarkdownText(msg.content, isUser)}
              </div>

              {Array.isArray(msg.proposals) &&
                msg.proposals.map((proposal) => {
                  const id = proposalIdentity(proposal);
                  return (
                    <div
                      key={id}
                      style={{
                        maxWidth: '92%',
                        background: '#ffffff',
                        border: '2px solid #19469d',
                        borderRadius: '12px',
                        padding: '14px',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#19469d', marginBottom: '10px', fontSize: '14px' }}>
                        Shift proposal (approval required)
                      </div>
                      <div
                        style={{
                          background: '#eff6ff',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#1e3a8a',
                          marginBottom: '12px',
                          display: 'grid',
                          gap: '6px',
                        }}
                      >
                        <div>
                          <strong>Staff:</strong> {proposal.staffName} ({proposal.staffRole || '—'})
                        </div>
                        <div>
                          <strong>Date:</strong> {String(proposal.shiftDate).slice(0, 10)}
                        </div>
                        <div>
                          <strong>Time:</strong> {String(proposal.startTime).slice(0, 5)} –{' '}
                          {String(proposal.endTime).slice(0, 5)}
                        </div>
                        {proposal.reason && (
                          <div>
                            <strong>Reason:</strong> {proposal.reason}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-hospital-primary"
                          disabled={isLoading || approvingId === id}
                          onClick={() => handleApproveProposal(proposal)}
                        >
                          {approvingId === id ? 'Approving...' : 'Approve & Create Shift'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}

        {isLoading && (
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Agent is thinking…</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '10px 16px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading || !agentHealth?.online}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: '999px',
              padding: '6px 12px',
              fontSize: '12px',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 16px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={
            agentHealth?.online
              ? 'Ask about coverage, staff, or suggested shifts…'
              : 'Start agent on port 8001 to chat…'
          }
          className="modal-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn-hospital-primary"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

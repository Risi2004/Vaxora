export function proposalIdentity(proposal) {
  return `${proposal.affiliationId}|${String(proposal.shiftDate).slice(0, 10)}|${proposal.startTime}|${proposal.endTime}`;
}

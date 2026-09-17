"""
Backward-compatibility bridge for agent imports.
Primary Booking Agent is located in bookingagent.py.
"""
try:
    from .bookingagent import booking_agent as agent_instance, BookingAgent, BOOKING_AGENT_SYSTEM_PROMPT as SYSTEM_PROMPT
except ImportError:
    from bookingagent import booking_agent as agent_instance, BookingAgent, BOOKING_AGENT_SYSTEM_PROMPT as SYSTEM_PROMPT

__all__ = ["agent_instance", "BookingAgent", "SYSTEM_PROMPT"]

// AI chat assistant powered by Google Gemini.
// How one message is answered:
//   1. Send the conversation + the list of tools to Gemini.
//   2. If Gemini asks for a tool (e.g. search_events), run it on our server and send back the result.
//   3. Repeat until Gemini answers in plain text.
// Gemini never touches the database or Ticketmaster itself; it can only ask our code to.
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { todayString, formatDisplayDate } from '../utils/dates.js';
import { getUser } from './user.service.js';
import { attachUserData } from './event.service.js';
import { toolDeclarations, runTool } from './chatTools.js';

const MAX_TOOL_ROUNDS = 5; // stop runaway loops

// Created once. Null when no API key is set (chat turned off).
const ai = config.geminiKey ? new GoogleGenAI({ apiKey: config.geminiKey }) : null;

// The assistant's standing instructions, rebuilt for each message (so "today" is always right)
function buildInstructions(user) {
  const today = todayString();
  return `You are the assistant inside "Event Tracker", an app for finding and tracking events.
Today is ${formatDisplayDate(today)} (${today}).
The user's name is ${user.name}. Their home city is ${user.city || 'not set'}.
If the user doesn't name a city, use ${user.city || config.defaultCity}.

Rules:
- Use the tools to find events and to change RSVPs. Never make up events, dates, venues or ids.
- Turn relative dates ("this weekend", "next Friday") into exact YYYY-MM-DD dates before calling a tool.
- Event cards are shown under your reply automatically, numbered like your results.
  So don't list every event; give a short summary and mention a few by number.
- When the user says "the first one" or "number 2", use the eventId from the most recent results.
- Only RSVP, cancel an RSVP or create a share link when the user clearly asks for it.
- A share link needs an RSVP first. If one is missing, offer to RSVP.
- Ticketmaster mostly covers the US, Canada, UK, Europe, Australia and New Zealand.
  If nothing is found, suggest another city, date range or category.
- Reply in plain text (no markdown), in a short and friendly way.
- Only help with events and this app. Politely decline anything else.`;
}

// Gemini sometimes answers 503 ("high demand") or 500 for a moment.
// These usually pass within seconds, so we wait and try again a couple of times.
const RETRY_DELAYS_MS = [1000, 3000];
const isTemporaryError = (err) => err.status === 503 || err.status === 500;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One call to Gemini (with retries). Turns API errors into plain messages for the user.
async function askGemini(contents, user) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent({
        model: config.geminiModel,
        contents,
        config: {
          systemInstruction: buildInstructions(user),
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });
    } catch (err) {
      // Temporary problem and retries left? Wait, then loop again.
      if (isTemporaryError(err) && attempt < RETRY_DELAYS_MS.length) {
        console.warn(`Gemini busy (HTTP ${err.status}), retrying...`);
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      console.error('Gemini error:', err.message);
      if (err.status === 429 || isTemporaryError(err)) {
        throw new AppError(503, 'The assistant is busy right now. Please try again in a minute.');
      }
      throw new AppError(502, 'The assistant is unavailable right now. Please try again later.');
    }
  }
}

// Text the frontend sends back next time as this reply's history.
// It includes the event ids, so a follow-up like "RSVP to number 2" still works.
function buildHistoryText(reply, events) {
  if (events.length === 0) return reply;
  const list = events.map((e, i) => `${i + 1}. ${e.title} on ${e.displayDate} (eventId: ${e.id})`).join('\n');
  return `${reply}\n\n[Events shown:\n${list}]`;
}

// Answers one chat message.
// history: earlier messages [{ role: 'user' | 'assistant', text }], already validated
export async function chat({ userId, message, history }) {
  if (!ai) {
    throw new AppError(503, 'The chat assistant is not available right now.');
  }

  const user = await getUser(userId);

  // The conversation in Gemini's format ('model' = the assistant)
  const contents = history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.text }],
  }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  // Shared with the tools: who is asking, and which events to show as cards
  const context = { user, shownEvents: [] };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await askGemini(contents, user);
    const calls = response.functionCalls || [];

    // No tool needed: this is the final answer
    if (calls.length === 0) {
      return finishReply(response.text || 'Done.', context);
    }

    // Keep Gemini's turn exactly as it was sent (it carries data Gemini needs next time)
    contents.push(response.candidates[0].content);

    // Run each requested tool and send all the results back in one message
    const resultParts = [];
    for (const call of calls) {
      const result = await runTool(call.name, call.args, context);
      resultParts.push({ functionResponse: { id: call.id, name: call.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: resultParts });
  }

  return finishReply('Sorry, that took too many steps. Could you ask in a simpler way?', context);
}

// Final shape sent to the frontend
async function finishReply(reply, context) {
  // Add the latest RSVP status and friend counts to the cards
  const events = await attachUserData(context.shownEvents, context.user.id);
  return {
    reply: reply.trim(),
    events,
    historyText: buildHistoryText(reply.trim(), events),
  };
}

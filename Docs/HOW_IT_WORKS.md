# ContextClock — How It Works

## Overview

ContextClock is a lightweight browser extension that adds real-world temporal awareness to AI chatbot conversations.

Modern AI systems understand conversational context, but they do not naturally understand real-world time progression.

Example:

- You talk to an AI at 2:00 AM
- The AI tells you to sleep
- You return the next morning
- The AI still behaves as if it is late night

ContextClock solves this by injecting lightweight temporal metadata into messages before they are sent.

---

# Example

Without ContextClock:

```text
User: I finally came back.
AI: You should sleep.
```

With ContextClock:

```text
[Morning · May 14 2026 · 8:42 AM · Last message: 9 hours ago]
User: I finally came back.
```

AI response becomes more contextually aware:

```text
Good morning. Hope you slept well.
```

---

# How ContextClock Works

## Step 1 — Detect Message Send

The extension detects when you:

- press Enter
- click the Send button

on supported AI platforms.

---

## Step 2 — Generate Temporal Context

ContextClock generates a lightweight timestamp block.

Example:

```text
[Morning · May 14 2026 · 8:42 AM]
```

Optional elapsed-time awareness:

```text
[Morning · May 14 2026 · 8:42 AM · Last message: 9 hours ago]
```

---

## Step 3 — Inject Context Into Message

Before the message is sent, ContextClock prepends the timestamp.

Original:

```text
I finally woke up.
```

Modified:

```text
[Morning · May 14 2026 · 8:42 AM]
I finally woke up.
```

---

## Step 4 — AI Receives Enhanced Context

The AI now understands:

- time of day
- day transitions
- long gaps between messages
- sleep/wake continuity
- conversational timing

This improves conversational realism and continuity.

---

# Supported Platforms

Currently supported:

- ChatGPT
- Claude
- Gemini

Planned:

- Perplexity
- Poe
- Grok
- DeepSeek

---

# Features

- Temporal Context Injection
- Elapsed Time Awareness
- Visual Timestamp Badges
- Platform Controls
- Compact Mode

---

# Design Philosophy

ContextClock is intentionally:

- lightweight
- minimal
- privacy-first
- local-only
- non-invasive

The goal is not to replace AI systems.

The goal is to improve conversational continuity using simple contextual metadata.

---

# Open Source

ContextClock is fully open source.

The project is designed for:

- transparency
- community contributions
- experimentation
- educational purposes

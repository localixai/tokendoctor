# Keep the cache warm

Claude Code keeps the main conversation in Anthropic's prompt cache for an hour on a plan. tokendoctor can send a short request just before that hour runs out, so a conversation you come back to after a break is read from the cache instead of written into it again.

## Turn it on

It is off by default.

```text
/tokendoctor keepalive on
```

Or `tokendoctor-set tokendoctor.keepalive true --write`, or pick it in `/tokendoctor:optimize`, which proposes it only when your own sessions show it would have paid. It applies from your next message, and `/tokendoctor keepalive off` stops the next ping.

## Why a break costs

Every message sends the whole conversation. While it is cached, the model reads it at the cache price: a tenth of the input price or less, by model. Once the hour has passed, the next message writes all of it into the cache again at twice the input price. For a conversation of 300K tokens that one message costs as much as 20 to 80 cached reads of it.

A ping reads the conversation from the cache once more, and a read starts the hour again.

## How it works

- **When.** Six minutes before the hour runs out, counted from the start of the last request that read or wrote the cache. That leaves time for one retry and for a timer that fires a little late.
- **What it sends.** A fork of the conversation: Claude Code's last request again, followed by a request to reply with the word "ok". Nothing is added to your conversation, and the fork has no tools.
- **How many.** A pause starts with 4 pings, which keep the cache warm for about 4.6 hours; each later ping is less likely to pay than the one before. The number moves between 2 and 6 as tokendoctor learns from your pauses: up when you came back while the cache was kept, down when the pings ran out before you did. A conversation you have already come back to after a long break gets one more.
- **Which conversations.** Those of 200K tokens or more, where a rewrite costs the most.
- **Idle compaction.** Claude Code summarizes a long conversation shortly before its hour runs out. While the pings keep the cache, tokendoctor skips that summary, since a conversation that is cheap to read gains nothing from it.

## When it does not ping

A ping on a cold cache would write the whole conversation for nothing, so tokendoctor sends one only when it knows the cache is warm. It has to know when the last request was sent, that its cache lives an hour, and that more than 2 minutes of the hour are left; the model must be the one that wrote the cache; and it must be able to read the machine's recent pings and your plan's usage. If any of that is missing, or a timer wakes after the laptop slept and finds less time left, there is no ping until your next message.

The pings also stop until your next message when:

- a ping had to write more than a tenth of the conversation into the cache again, or 16K tokens where that is more (every request of Claude Code's writes a short tail anew even on a warm cache: 7.7K tokens on Sonnet 5.5);
- the API answers with a rate limit, or with any error but an overloaded API, which gets one retry while there is time;
- you start typing.

Across every session on the machine there are at most 3 pings an hour and 30 a day, and none once your 5-hour or weekly limit is 80% used.

On an API key the cache lives 5 minutes unless you set `/tokendoctor cache 1h`, and the keepalive does nothing there.

## What it costs

On a plan a ping uses a little of your usage limit, as a rewrite does; on an API key it costs money. `/tokendoctor:sessions` replays the same rules over your past sessions (the `keepalive-would-save` finding): how many pauses would have come back to a warm cache, what the rewrites it saved would have cost, what the pings would have cost, and how many pauses the pings did not help: those where they ran out before you came back, and those where you came back within the hour anyway.

## Checked on a live session

One Claude Code session on Sonnet 5.5, on 26 November 2026, with a ping at minute 54 and nothing else in between:

| Minute | Request | Read from cache | Written |
| --- | --- | --- | --- |
| 0 | yours | 21,877 | 0 |
| 54 | the ping | 21,880 | 0 |
| 70 | yours | 21,880 | 11 |

The last message came 70 minutes after the one before it, past the cache's hour, and was still read from the cache: the ping had started the hour again.

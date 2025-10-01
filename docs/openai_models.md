# OpenAI Models Reference Guide

## Overview

This document provides a comprehensive overview of all OpenAI models available as of October 2025, with detailed pricing information and Responses API compatibility. All pricing is per 1 million tokens unless otherwise noted.

---

## 🧠 GPT-5 SERIES (Flagship Reasoning Models)

**All GPT-5 models are reasoning models** - they produce an internal chain of thought before responding. This makes them especially proficient in:
- Code generation, bug fixing, and refactoring
- Instruction following
- Long context and tool calling
- Multi-step agentic tasks

### GPT-5 (Flagship Reasoning Model)
- **Released:** 2025
- **Context:** 400K input / 128K output tokens
- **Input Cost:** $1.25 / 1M tokens
- **Cached Input Cost:** $0.13 / 1M tokens (90% discount)
- **Output Cost:** $10.00 / 1M tokens
- **Responses API:** ✅ Full Support
- **Reasoning Effort:** Configurable (minimal/low/medium/high)
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported (including custom tools)
- **Knowledge Cutoff:** September 30, 2024
- **Best For:** Complex reasoning, broad world knowledge, code-heavy or multi-step agentic tasks
- **System Card Name:** gpt-5-thinking
- **API Alias:** gpt-5

### GPT-5-mini (Cost-Optimized Reasoning)
- **Released:** 2025
- **Context:** 400K input / 128K output tokens
- **Input Cost:** $0.25 / 1M tokens
- **Cached Input Cost:** $0.03 / 1M tokens (88% discount)
- **Output Cost:** $2.00 / 1M tokens
- **Responses API:** ✅ Full Support
- **Reasoning Effort:** Configurable
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported (including custom tools)
- **Knowledge Cutoff:** May 31, 2024
- **Best For:** Cost-optimized reasoning and chat; balances speed, cost, and capability
- **System Card Name:** gpt-5-thinking-mini
- **API Alias:** gpt-5-mini

### GPT-5-nano (Ultra Budget Reasoning)
- **Released:** 2025
- **Context:** 400K input / 128K output tokens
- **Input Cost:** $0.05 / 1M tokens
- **Cached Input Cost:** $0.01 / 1M tokens (80% discount)
- **Output Cost:** $0.40 / 1M tokens
- **Responses API:** ✅ Full Support
- **Reasoning Effort:** Configurable
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported (including custom tools)
- **Knowledge Cutoff:** May 31, 2024
- **Best For:** High-throughput tasks, simple instruction-following or classification
- **System Card Name:** gpt-5-thinking-nano
- **API Alias:** gpt-5-nano

### GPT-5-chat-latest (Non-Reasoning Variant)
- **Released:** 2025
- **Context:** 400K input / 128K output tokens
- **Pricing:** Same as GPT-5
- **Responses API:** ✅ Full Support
- **Reasoning:** ❌ No chain of thought (faster responses)
- **System Card Name:** gpt-5-main
- **API Alias:** gpt-5-chat-latest
- **Best For:** When speed and maximum context length are paramount

---

## 🚀 GPT-4 SERIES (Non-Reasoning Chat Models)

High-performance general-purpose models:

### GPT-4.1 (Latest Flagship Chat)
- **Released:** April 14, 2025
- **Context:** 1M input / 32K output tokens
- **Input Cost:** $2.00 / 1M tokens
- **Output Cost:** $8.00 / 1M tokens
- **Responses API:** ✅ Full Support
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported
- **Best For:** Large context processing when speed is critical

### GPT-4.1 Mini (Budget Chat)
- **Released:** April 14, 2025
- **Context:** 1M input / 32K output tokens
- **Input Cost:** $0.40 / 1M tokens
- **Output Cost:** $1.60 / 1M tokens
- **Responses API:** ✅ Full Support
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported
- **Best For:** Cost-effective general tasks

### GPT-4.1 Nano (Ultra Budget Chat)
- **Released:** April 14, 2025
- **Context:** 1M input / 32K output tokens
- **Input Cost:** $0.10 / 1M tokens
- **Output Cost:** $0.40 / 1M tokens
- **Responses API:** ✅ Full Support
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported
- **Best For:** High-volume simple tasks, pre-filtering

### GPT-4o (Multimodal)
- **Released:** November 20, 2024 (latest)
- **Context:** 128K input / 16K output tokens
- **Input Cost:** $2.50 / 1M tokens
- **Output Cost:** $10.00 / 1M tokens
- **Responses API:** ✅ Full Support
- **Vision:** ✅ Supported
- **Audio:** ✅ Supported
- **Tools:** ✅ Supported
- **Best For:** Fast multimodal processing

### ChatGPT-4o Latest
- **Model ID:** chatgpt-4o-latest
- **Context:** 128K input / 16K output tokens
- **Pricing:** Same as GPT-4o
- **Responses API:** ✅ Full Support
- **Note:** Model used in ChatGPT interface

### GPT-4o Mini
- **Released:** July 18, 2024
- **Context:** 128K input / 16K output tokens
- **Input Cost:** $0.15 / 1M tokens
- **Output Cost:** $0.60 / 1M tokens
- **Responses API:** ✅ Full Support
- **Vision:** ✅ Supported
- **Tools:** ✅ Supported
- **Best For:** Budget multimodal tasks

---

## 🔍 SPECIALIZED MODELS

### GPT-4o Search Preview
- **Context:** 128K input / 16K output tokens
- **Input Cost:** $2.50 / 1M tokens
- **Output Cost:** $10.00 / 1M tokens
- **Responses API:** ✅ Full Support
- **Special Feature:** Enhanced web search capabilities
- **Best For:** Research, news analysis

### GPT-4o Mini Search Preview
- **Model ID:** gpt-4o-mini-search-preview-2025-03-11
- **Context:** 128K input / 16K output tokens
- **Input Cost:** $0.15 / 1M tokens
- **Output Cost:** $0.60 / 1M tokens
- **Responses API:** ✅ Full Support (Chat Completions only, not Responses)
- **Best For:** Budget web search and research

### Computer Use Preview
- **Model ID:** computer-use-preview
- **Input Cost:** $2.50 / 1M tokens
- **Output Cost:** $10.00 / 1M tokens
- **Responses API:** ✅ Full Support
- **Special Feature:** Can interact with computer interfaces
- **Best For:** Automated interactions

### Codex Mini Latest
- **Model ID:** codex-mini-latest
- **Pricing:** Contact OpenAI for pricing
- **Responses API:** ✅ Full Support
- **Best For:** Code generation and analysis

### GPT-5-Codex
- **Context:** 400K input / 128K output tokens
- **Pricing:** Contact OpenAI for pricing
- **Responses API:** ✅ Full Support
- **Reasoning Effort:** Configurable (low/medium/high)
- **Note:** Specifically designed for Codex/Codex CLI environments
- **Best For:** Agentic coding tasks in Codex environments only

---

## ⚠️ DEPRECATED MODELS (Do Not Use)

### o1 Series (Deprecated Reasoning Models)
**Status:** ❌ Deprecated - Replaced by GPT-5 and o3/o4 series

#### o1 (Deprecated)
- **Released:** December 17, 2024
- **Status:** ❌ **DEPRECATED** - Use GPT-5 instead
- **Input Cost:** $15.00 / 1M tokens
- **Output Cost:** $60.00 / 1M tokens
- **Migration:** Use **gpt-5** with medium or high reasoning

#### o1-mini (Deprecated)
- **Released:** September 12, 2024
- **Status:** ❌ **DEPRECATED** - Use o4-mini or GPT-5-mini instead
- **Input Cost:** $1.10 / 1M tokens
- **Output Cost:** $4.40 / 1M tokens
- **Migration:** Use **o4-mini** or **gpt-5-mini**

#### o1-pro (Deprecated)
- **Released:** December 17, 2024
- **Status:** ❌ **DEPRECATED** - Extremely expensive
- **Input Cost:** $150.00 / 1M tokens
- **Output Cost:** $600.00 / 1M tokens
- **Migration:** Use **o3** or **gpt-5** with high reasoning

### o3/o4 Series (Being Phased Out)

#### o3 (Previous Generation Reasoning)
- **Released:** April 16, 2025
- **Status:** ⚠️ Still supported but **GPT-5 is preferred**
- **Input Cost:** $10.00 / 1M tokens
- **Output Cost:** $40.00 / 1M tokens
- **Migration:** Use **gpt-5** with medium or high reasoning

#### o4-mini (Previous Generation Cost-Effective Reasoning)
- **Released:** April 16, 2025
- **Status:** ⚠️ Still supported but **GPT-5-mini/nano preferred**
- **Input Cost:** $1.10 / 1M tokens
- **Output Cost:** $4.40 / 1M tokens
- **Migration:** Use **gpt-5-mini** or **gpt-5-nano**

#### o3-mini (Alternative Small Reasoning)
- **Released:** January 31, 2025
- **Status:** ⚠️ Still supported but GPT-5 series preferred
- **Input Cost:** $1.10 / 1M tokens
- **Output Cost:** $4.40 / 1M tokens
- **Vision:** ❌ Not Supported
- **Migration:** Use **gpt-5-mini** or **gpt-5-nano**

### GPT-4 Series (Being Sunsetted)

#### GPT-4 (Being Discontinued)
- **Status:** ❌ Being discontinued in 2025
- **Recommendation:** Migrate to GPT-4.1 or GPT-5
- **Input Cost:** $30.00 / 1M tokens
- **Output Cost:** $60.00 / 1M tokens

#### GPT-4 Turbo
- **Status:** ⚠️ Superseded by GPT-4.1
- **Input Cost:** $10.00 / 1M tokens
- **Output Cost:** $30.00 / 1M tokens
- **Recommendation:** Migrate to GPT-4.1

#### GPT-4.5 (Cost Prohibitive)
- **Input Cost:** $75.00 / 1M tokens
- **Output Cost:** $150.00 / 1M tokens
- **Status:** ❌ Not recommended due to extreme cost

### GPT-3.5 Turbo (Legacy)
- **Status:** ⚠️ Legacy model
- **Input Cost:** $0.50 / 1M tokens
- **Output Cost:** $1.50 / 1M tokens
- **Recommendation:** Use GPT-4.1 Nano or GPT-5-nano instead

---

## 🔊 REALTIME MODELS

For voice/audio applications (limited Responses API support):

### GPT-4o Realtime Preview
- **Released:** December 17, 2024
- **Text Input:** $2.50 / 1M tokens
- **Text Output:** $10.00 / 1M tokens
- **Audio Input:** $100.00 / 1M tokens
- **Audio Output:** $200.00 / 1M tokens
- **Responses API:** ⚠️ Limited Support

### GPT-4o Mini Realtime Preview
- **Text Input:** $0.15 / 1M tokens
- **Text Output:** $0.60 / 1M tokens
- **Audio Input:** $10.00 / 1M tokens
- **Audio Output:** $20.00 / 1M tokens
- **Responses API:** ⚠️ Limited Support

---

## 🎨 IMAGE GENERATION MODELS

### GPT Image 1 (Latest)
- **Released:** 2025
- **Pricing:** $0.08 per image (1024x1024)
- **Responses API:** ❌ Not Compatible

### DALL-E 3
- **Standard Quality:** $0.040 per image (1024x1024)
- **HD Quality:** $0.080 per image (1024x1024)
- **Responses API:** ❌ Not Compatible

### DALL-E 2
- **Pricing:** $0.020 per image (1024x1024)
- **Responses API:** ❌ Not Compatible

---

## 🎵 AUDIO MODELS

### Text-to-Speech
- **GPT-4o Mini TTS:** $15.00 / 1M characters
- **TTS-1:** $15.00 / 1M characters
- **TTS-1 HD:** $30.00 / 1M characters
- **Responses API:** ❌ Not Compatible

### Transcription
- **GPT-4o Transcribe:** $6.00 / hour
- **GPT-4o Mini Transcribe:** $1.50 / hour
- **Whisper-1:** $6.00 / hour
- **Responses API:** ❌ Not Compatible

---

## 📄 EMBEDDINGS

### Text Embedding 3 Large
- **Pricing:** $0.13 / 1M tokens
- **Dimensions:** 3,072
- **Responses API:** ❌ Not Compatible

### Text Embedding 3 Small
- **Pricing:** $0.02 / 1M tokens
- **Dimensions:** 1,536
- **Responses API:** ❌ Not Compatible

### Text Embedding Ada 002 (Legacy)
- **Pricing:** $0.10 / 1M tokens
- **Responses API:** ❌ Not Compatible

---

## 🛡️ MODERATION

### Omni Moderation Latest
- **Pricing:** $2.00 / 1M tokens
- **Features:** Text + Image moderation
- **Responses API:** ❌ Not Compatible

### Text Moderation Latest (Deprecated)
- **Pricing:** $2.00 / 1M tokens
- **Status:** ⚠️ Deprecated
- **Responses API:** ❌ Not Compatible

---

## 🎯 RECOMMENDED MODELS BY USE CASE

### For Complex Reasoning Tasks:
1. **GPT-5** (flagship) - Best overall performance
2. **GPT-5-mini** - Excellent balance of cost and capability
3. **GPT-5-nano** - Budget option with strong performance

### For Speed-Critical Tasks:
1. **GPT-5** with minimal reasoning effort
2. **GPT-4.1** - Fast non-reasoning alternative
3. **GPT-5-chat-latest** - Non-reasoning variant of GPT-5

### For High-Volume/Budget Tasks:
1. **GPT-5-nano** ($0.05/$0.40, cached: $0.01) - Best value with massive context
2. **GPT-4.1 Nano** ($0.10/$0.40) - Alternative budget option
3. **GPT-4o Mini** ($0.15/$0.60) - Budget multimodal

### For Multimodal (Vision/Audio):
1. **GPT-5** - Flagship with vision support
2. **GPT-4o** - Fast multimodal processing
3. **GPT-4o Mini** - Budget multimodal

### For Web Search:
1. **GPT-4o-mini-search-preview-2025-03-11** - Budget web search (Chat Completions only)
2. **GPT-4o Search Preview** - Premium web search

---

## 💡 GPT-5 BEST PRACTICES

### Faster Responses (Low Latency)
For coding and agentic tasks where speed is critical:

```typescript
const result = await openai.responses.create({
  model: "gpt-5",
  input: "Write a haiku about code.",
  reasoning: { effort: "low" },      // or "minimal" for fastest
  text: { verbosity: "low" },
});
```

### Minimal Reasoning Effort
- **Use Case:** Fastest possible time-to-first-token
- **Produces:** Very few reasoning tokens
- **Best For:** Coding, instruction following, adhering to directions
- **Note:** May require prompting to "think" or outline steps for complex tasks

### Verbosity Control
- **High Verbosity:** Thorough explanations, extensive code refactoring
- **Medium Verbosity:** Default balanced output
- **Low Verbosity:** Concise answers, simple code generation (SQL queries)

### Custom Tools
GPT-5 supports custom tools with freeform text inputs:

```typescript
{
  "type": "custom",
  "name": "code_exec",
  "description": "Executes arbitrary python code"
}
```

### Allowed Tools
Restrict model to subset of available tools for safety:

```typescript
"tool_choice": {
  "type": "allowed_tools",
  "mode": "auto",
  "tools": [
    { "type": "function", "name": "get_weather" },
    { "type": "function", "name": "search_docs" }
  ]
}
```

### Preambles
Enable explanations before tool calls:

```typescript
// Add to system message:
"Before you call a tool, explain why you are calling it."
```

GPT-5 will prepend a concise rationale to each tool call.

---

## ⚙️ GPT-5 TECHNICAL NOTES

### Unsupported Parameters
⚠️ **These parameters raise errors with GPT-5:**
- `temperature`
- `top_p`
- `logprobs`

### GPT-5 Equivalents:
- **Reasoning depth:** `reasoning: { effort: "minimal" | "low" | "medium" | "high" }`
- **Output verbosity:** `text: { verbosity: "low" | "medium" | "high" }`
- **Output length:** `max_output_tokens`

### Chain of Thought (CoT) Passing
- **Key Feature:** Pass previous reasoning between turns via `previous_response_id`
- **Benefits:** Fewer generated reasoning tokens, higher cache hit rates, lower latency
- **Only Available:** Responses API (not Chat Completions)

### Model Selection in ChatGPT
ChatGPT uses two GPT-5 variants:
- **gpt-5-chat:** Minimal reasoning (fast responses)
- **gpt-5-thinking:** Full reasoning (complex tasks)
- Routing layer selects best model based on question

---

## 📊 RESPONSES API FEATURE MATRIX

| Model | Responses API | Reasoning | Vision | Tools | Caching | Context | Best Use Case |
|-------|---------------|-----------|--------|-------|---------|---------|---------------|
| **GPT-5** | ✅ | ✅✅✅ | ✅ | ✅ | ✅ | **400K** | **Flagship reasoning** |
| **GPT-5-mini** | ✅ | ✅✅ | ✅ | ✅ | ✅ | **400K** | **Cost-effective reasoning** |
| **GPT-5-nano** | ✅ | ✅ | ✅ | ✅ | ✅ | **400K** | **Ultra budget reasoning** |
| GPT-5-chat-latest | ✅ | ❌ | ✅ | ✅ | ✅ | 400K | Fast non-reasoning |
| o3 | ✅ | ✅✅✅ | ✅ | ✅ | ❌ | 200K | Deep reasoning (deprecated) |
| o4-mini | ✅ | ✅✅ | ✅ | ✅ | ❌ | 200K | Budget reasoning (deprecated) |
| GPT-4.1 | ✅ | ✅ | ✅ | ✅ | ❌ | 1M | Large context chat |
| GPT-4.1 Mini | ✅ | ✅ | ✅ | ✅ | ❌ | 1M | Budget chat |
| GPT-4.1 Nano | ✅ | ✅ | ✅ | ✅ | ❌ | 1M | Ultra budget chat |
| GPT-4o | ✅ | ✅ | ✅ | ✅ | ❌ | 128K | Multimodal |
| GPT-4o Mini | ✅ | ✅ | ✅ | ✅ | ❌ | 128K | Budget multimodal |

---

## 💰 COST OPTIMIZATION TIPS

1. **🆕 Leverage GPT-5 Caching:** 80-90% discount on cached inputs - perfect for system prompts!
2. **Use Input Caching:** 75% discount on repeated prompts (GPT-4 series)
3. **Tier Your Pipeline:** Cheap models filter, expensive models decide
4. **Batch Processing:** Use Batch API for 50% discount
5. **Smart Context Management:** GPT-5's 400K context allows larger prompts efficiently
6. **Model Switching:** Use different models for different complexity levels
7. **Minimal Reasoning:** Use `effort: "minimal"` when speed is critical
8. **Low Verbosity:** Reduce token usage with concise outputs

---

## 🔄 MIGRATION GUIDE

### From o1 → GPT-5
- **Recommended:** GPT-5 with **medium or high reasoning**
- **Benefits:** Better performance, caching support, 400K context
- Start with medium, increase to high if needed

### From o1-mini / o4-mini → GPT-5-mini
- **Recommended:** GPT-5-mini with prompt tuning
- **Benefits:** Similar cost, better performance, caching support

### From GPT-4.1 → GPT-5
- **Recommended:** GPT-5 with **minimal or low reasoning**
- **Benefits:** Better instruction following, reasoning when needed
- Start with minimal, tune prompts, increase to low if needed

### From GPT-4.1-mini → GPT-5-mini
- **Recommended:** GPT-5-mini with prompt tuning
- **Benefits:** Slightly higher cost but reasoning capabilities

### From GPT-4.1-nano → GPT-5-nano
- **Recommended:** GPT-5-nano with prompt tuning
- **Benefits:** Similar cost, reasoning capabilities, 400K context

---

*Last updated: October 2025*  
*All prices subject to change - verify with OpenAI's official pricing*  
*Focused on models compatible with Responses API*  
*🆕 GPT-5 series are now flagship reasoning models with 400K context and cached input pricing*  
*❌ o1 series deprecated - migrate to GPT-5 or o3/o4 for reasoning tasks*

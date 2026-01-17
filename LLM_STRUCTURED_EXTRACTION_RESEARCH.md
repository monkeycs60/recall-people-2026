# LLM Structured Extraction Research - January 2025

## Executive Summary

For voice note fact extraction (fast, cost-effective, reliable structured JSON), the recommended options are:

**Top Recommendation: GPT-4o-mini**
- **Price**: $0.15/M input, $0.60/M output tokens
- **Speed**: 85.2 tokens/second
- **Best for**: Best overall balance of cost, speed, and reliability for production use

**Runner-up: Gemini 2.0 Flash**
- **Price**: $0.075/M input, $0.30/M output tokens (cheapest)
- **Speed**: 120 tokens/second (fastest in class)
- **Best for**: Maximum cost savings with excellent performance

**Premium Option: Claude 3.5 Haiku**
- **Price**: $1.00/M input, $5.00/M output tokens
- **Speed**: 23 tokens/second (slower but very reliable)
- **Best for**: Highest accuracy when cost is less critical

---

## Detailed Provider & Model Comparison

### OpenAI Models

#### GPT-4o-mini ⭐ **RECOMMENDED**
- **Pricing**: $0.15/M input, $0.60/M output tokens
- **Speed**: 85.2 tokens/second
- **Context**: 128K tokens
- **Features**: Native Structured Outputs API (100% schema compliance), function calling, JSON mode
- **Reliability**: Achieves 100% schema adherence with Structured Outputs mode
- **Best for**: Production-ready structured extraction with excellent cost/performance ratio

#### GPT-4o
- **Pricing**: $2.50/M input, $10.00/M output tokens
- **Speed**: 95 tokens/second
- **Context**: 128K tokens
- **Use case**: Overkill for simple fact extraction; use for complex reasoning tasks only

**Sources**:
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [GPT-4o mini: advancing cost-efficient intelligence](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/)
- [Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)

---

### Anthropic (Claude) Models

#### Claude 3.5 Haiku
- **Pricing**: $1.00/M input, $5.00/M output tokens
- **Speed**: 23 tokens/second (slower than competitors)
- **TTFT**: 0.36 seconds (very fast time-to-first-token)
- **Context**: 200K tokens
- **Benchmarks**: 88.1% on HumanEval, 41.6% on GPQA Diamond
- **Strengths**: Excellent for coding, low hallucination rate for structured tasks
- **Weaknesses**: 6.4x more expensive than GPT-4o-mini, slower throughput

#### Claude 3.5 Sonnet / Claude Sonnet 4.5
- **Pricing**: Higher tier (~$3-15/M tokens depending on version)
- **Speed**: 50.88 tokens/second
- **TTFT**: 0.64 seconds
- **Benchmarks**: 93.7% on HumanEval, 65.0% on GPQA Diamond
- **Use case**: Best for complex reasoning/coding, not cost-effective for simple extraction

**Hybrid Strategy**: Use Haiku for front-end rapid responses, Sonnet for verification/analysis.

**Sources**:
- [Claude 3.5 Haiku vs GPT-4o Mini - Detailed Performance & Feature Comparison](https://docsbot.ai/models/compare/claude-3-5-haiku/gpt-4o-mini)
- [Claude 3.5 Haiku vs. Sonnet: Speed or Power?](https://www.keywordsai.co/blog/claude-3-5-sonnet-vs-claude-3-5-haiku)
- [Claude 3.5 Haiku vs GPT-4o mini: Model Comparison](https://artificialanalysis.ai/models/comparisons/claude-3-5-haiku-vs-gpt-4o-mini)

---

### Google (Gemini) Models

#### Gemini 2.0 Flash ⭐ **BEST VALUE**
- **Pricing**: $0.075/M input, $0.30/M output tokens (cheapest option)
- **Speed**: 120 tokens/second (fastest in comparison)
- **Context**: Large context window
- **Features**: Native JSON Schema support, structured outputs, multimodal (text + images)
- **Performance**: Comparable accuracy to Claude 3.5 Sonnet at fraction of cost
- **Audio**: 25 tokens/sec audio I/O, 258 tokens/sec video input
- **Vision**: 1080p image processing in 0.8 seconds
- **Important**: Gemini 2.0 Flash will be retired March 3, 2026 - migrate to Gemini 2.5 Flash

#### Gemini 2.5 Flash / 3 Flash
- **Pricing**: Gemini 3 Flash is $0.50/M input, $3.00/M output tokens
- **Features**: Property ordering preservation, anyOf/$ref support in JSON Schema
- **Known issue**: Structured outputs may fail when tool calls are in message history (2.5 models)

**Sources**:
- [Gemini 2.0 Flash - Intelligence, Performance & Price Analysis](https://artificialanalysis.ai/models/gemini-2-0-flash)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Improving Structured Outputs in the Gemini API](https://blog.google/technology/developers/gemini-api-structured-outputs/)
- [Structured outputs | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output)

---

### Open Source Models via Fast Inference Providers

#### Groq (Llama 3.3 70B)
- **Pricing**: $0.59/M input, $0.79/M output tokens
- **Speed**: 276 tokens/second (standard), **1660 tokens/second** (speculative decoding version)
- **TTFT**: Sub-300ms time-to-first-token
- **Context**: 128K tokens (Versatile), 8K (Specdec)
- **Features**: Ultra-low latency, tool/function calling support
- **Best for**: When speed is critical and you need open-source model

#### Mistral Small 3 (24B)
- **Pricing**: $0.10/M input, $0.30/M output tokens (very competitive)
- **Speed**: 150 tokens/second, 3x faster than Llama 3.3 70B on same hardware
- **Released**: January 30, 2025
- **Features**: Function calling, structured outputs, tool use
- **Performance**: On par with Llama 3.3 70B accuracy despite being 3x smaller
- **License**: Apache 2.0
- **Availability**: Together AI, planned for Groq, NVIDIA NIM, Amazon SageMaker

**Sources**:
- [Groq Llama 3.3 70B: Pricing, Latency, Speed](https://groq.com/pricing)
- [Llama 3.3 70B: API Provider Performance Benchmarking](https://artificialanalysis.ai/models/llama-3-3-instruct-70b/providers)
- [New AI Inference Speed Benchmark for Llama 3.3 70B, Powered by Groq](https://groq.com/blog/new-ai-inference-speed-benchmark-for-llama-3-3-70b-powered-by-groq)
- [Mistral Small 3](https://simonwillison.net/2025/Jan/30/mistral-small-3/)
- [Mistral Small 3 24B Instruct: Pricing, Context Window, Benchmarks](https://llm-stats.com/models/mistral-small-24b-instruct-2501)

---

### Together AI & Fireworks AI

**Together AI**:
- Per-1000-token pricing: $0.0001 (small models) to $0.003 (40-70B models)
- $25 free credits for new users, up to 60% discounts
- Fine-tuning: $0.80-$2.00 per 1M training tokens

**Fireworks AI**:
- Per-million-token model: $0.10 (small) to $3.00 (MoE models like Mixtral)
- 10-50% discounts available, special rates for students/NGOs
- Emphasis on inference speed and multimodal support

**Both platforms**:
- Support structured JSON outputs to reduce token waste
- Token-based serverless pricing
- Open-source model access

**Sources**:
- [11 Best LLM API Providers: Compare Inferencing Performance & Pricing](https://www.helicone.ai/blog/llm-api-providers)
- [Fireworks AI vs Together AI](https://northflank.com/blog/fireworks-ai-vs-together-ai)
- [The Complete AI Agency Cost Control Playbook](https://medium.com/@ap3617180/the-complete-ai-agency-cost-control-playbook-when-to-use-which-llm-provider-and-architecture-9cf01d22e3fb)

---

## Best Practices for Reliable JSON Extraction (2025)

### 1. Use Native Structured Output APIs

**Reliability Ranking**:
1. **Structured Outputs** (100% schema compliance) ✅
2. **Function Calling** (use-case dependent)
3. **JSON Mode** (only guarantees valid JSON, not schema adherence)

**OpenAI Structured Outputs** achieves 100% reliability vs. <40% for older approaches.

**Key Insight**: Use Structured Outputs when available instead of JSON mode - it strictly enforces schema adherence.

**Sources**:
- [When should I use function calling, structured outputs or JSON mode?](https://www.vellum.ai/blog/when-should-i-use-function-calling-structured-outputs-or-json-mode)
- [Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)

---

### 2. Schema Definition with Pydantic

Use **Pydantic models** to define schemas:
- Clear type enforcement
- Automatic validation
- Works with OpenAI Structured Outputs, LangChain, Instructor

```python
from pydantic import BaseModel

class PersonFact(BaseModel):
    category: str
    fact: str
    confidence: float
```

---

### 3. Constrained Generation Libraries

**Top Tools for 2025**:
- **Outlines** (Apache 2.0): Token-by-token guidance using Pydantic/JSON Schema
- **Instructor**: Self-correcting mechanisms for reliability
- **LangChain**: `.with_structured_output()` for provider abstraction
- **vLLM**: Guided JSON for production deployments

**Sources**:
- [The guide to structured outputs and function calling with LLMs](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [GitHub - awesome-llm-json](https://github.com/imaurer/awesome-llm-json)

---

### 4. Implementation Approaches

**For OpenAI models**:
```python
# Use native Structured Outputs API
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "person_facts",
            "schema": PersonFactSchema
        }
    }
)
```

**For other providers**:
- Use function calling if supported
- Fallback to JSON mode + Pydantic validation
- Consider Outlines/Instructor for additional reliability

---

## Speed/Cost/Quality Trade-offs

### Ultra-Fast (Real-time User Experience)
**Groq Llama 3.3 70B Specdec**: 1660 tokens/sec, $0.59/$0.79
- Best for: When sub-second response is critical
- Trade-off: Higher cost than mini models

### Balanced (Best Overall Value) ⭐
**GPT-4o-mini**: 85 tokens/sec, $0.15/$0.60
- Best for: Production use with great cost/performance
- Trade-off: None - excellent all-around choice

### Budget (Maximum Cost Savings) 💰
**Gemini 2.0 Flash**: 120 tokens/sec, $0.075/$0.30
- Best for: High-volume extraction with tight budgets
- Trade-off: Migrate to 2.5 Flash before March 2026 deprecation

### Premium Quality (Lowest Hallucination)
**Claude 3.5 Haiku**: 23 tokens/sec, $1.00/$5.00
- Best for: When accuracy is paramount, cost secondary
- Trade-off: Slower and 6-8x more expensive

### Emerging Value Option
**Mistral Small 3**: 150 tokens/sec, $0.10/$0.30
- Best for: Open-source preference, competitive pricing
- Trade-off: Newer model (Jan 2025), less battle-tested

---

## Cost Estimation Examples

**Scenario**: Extract facts from 500-word voice note (~650 input tokens + 200 output tokens)

| Model | Input Cost | Output Cost | Total per Extract | 10K Extracts/Month |
|-------|-----------|-------------|-------------------|-------------------|
| **Gemini 2.0 Flash** | $0.000049 | $0.000060 | $0.000109 | **$1.09** |
| **Mistral Small 3** | $0.000065 | $0.000060 | $0.000125 | **$1.25** |
| **GPT-4o-mini** | $0.000098 | $0.000120 | $0.000218 | **$2.18** |
| **Groq Llama 3.3** | $0.000384 | $0.000158 | $0.000542 | **$5.42** |
| **Claude 3.5 Haiku** | $0.000650 | $0.001000 | $0.001650 | **$16.50** |
| **GPT-4o** | $0.001625 | $0.002000 | $0.003625 | **$36.25** |

---

## Recommendations by Use Case

### Voice Note Fact Extraction (Your Use Case)

**Primary Recommendation**: **GPT-4o-mini**
- Proven reliability with Structured Outputs
- Fast enough for user-facing (85 tok/sec)
- Excellent cost/performance ($2.18 per 10K extracts)
- 100% schema adherence guarantee

**Alternative for Budget**: **Gemini 2.0 Flash**
- 50% cheaper than GPT-4o-mini
- Faster (120 tok/sec)
- Comparable accuracy per benchmarks
- Migrate to 2.5 Flash before March 2026

**Alternative for Quality**: **Claude 3.5 Haiku**
- Lowest hallucination rate
- Best for mission-critical extraction
- 7.5x more expensive than GPT-4o-mini

### Implementation Strategy

1. **Start with GPT-4o-mini** using Structured Outputs API
2. **Define strict Pydantic schemas** for fact extraction
3. **Monitor quality metrics** (schema compliance, user corrections)
4. **A/B test Gemini 2.0 Flash** if cost becomes an issue
5. **Consider Groq Llama 3.3 Specdec** if latency is critical (sub-second responses)

---

## Recent Developments (2024-2025)

### Major Updates

1. **OpenAI Structured Outputs** (Aug 2024): 100% schema compliance for GPT-4o/mini
2. **Gemini 2.0 Flash** (Late 2024): Cheapest fast option with structured outputs
3. **Mistral Small 3** (Jan 2025): New competitive option at $0.10/$0.30
4. **Groq Speculative Decoding** (2024): 1660 tok/sec for Llama 3.3 70B
5. **Claude 3.5 Haiku** (2024): Fast, reliable mid-tier option from Anthropic

### Key Trends

- **Structured Outputs > JSON Mode**: Native APIs guarantee schema compliance
- **Speed Competition**: Groq leads with 1660 tok/sec, Gemini at 120 tok/sec
- **Cost Pressure**: Gemini 2.0 Flash at $0.075/M undercuts competitors by 50%+
- **Open Source**: Llama 3.3 70B matches proprietary quality at lower cost
- **Small Models Rising**: Mistral 24B matches Llama 70B at 3x speed

**Sources**:
- [Structured Output AI Reliability Guide 2025](https://www.cognitivetoday.com/2025/10/structured-output-ai-reliability/)
- [Best LLM Models for Document Processing in 2025](https://algodocs.com/best-llm-models-for-document-processing-in-2025/)

---

## Additional Resources

### Benchmarks & Comparisons
- [Artificial Analysis - Model Comparisons](https://artificialanalysis.ai/)
- [LLM Stats - Model Database](https://llm-stats.com/)
- [StructEval Benchmark](https://arxiv.org/html/2505.20139v1)

### Libraries & Tools
- [Awesome LLM JSON (GitHub)](https://github.com/imaurer/awesome-llm-json)
- [LangChain Structured Output Guide](https://mirascope.com/blog/langchain-structured-output)
- [Outlines Documentation](https://github.com/outlines-dev/outlines)

### Provider Documentation
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Gemini API Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Groq Documentation](https://console.groq.com/docs)

---

## Conclusion

For extracting facts, events, and categorized information from voice notes about people:

**Use GPT-4o-mini as your primary model** with OpenAI's Structured Outputs API for guaranteed schema compliance, excellent speed (85 tok/sec), and strong cost-performance ($0.15/$0.60 per million tokens).

**Consider Gemini 2.0 Flash for budget-conscious scaling** at half the cost with even faster speed (120 tok/sec), but plan migration to Gemini 2.5 Flash before March 2026.

**Avoid older approaches** like JSON mode or basic prompting - use native Structured Outputs APIs which achieve 100% schema compliance vs. <40% with older methods.

The structured extraction landscape has matured significantly in 2024-2025, with multiple excellent options available. The key is choosing the right tool based on your specific speed/cost/quality requirements.

"""Contratos compartilhados pelos provedores de IA."""

from collections.abc import Mapping, Sequence


class AIClientError(RuntimeError):
    """Falha de comunicação ou resposta inválida do provedor de IA."""

    def __init__(self, message: str, *, retryable: bool = True):
        super().__init__(message)
        self.retryable = retryable


def build_chat_messages(
    system_prompt: str,
    user_prompt: str,
    history: Sequence[Mapping[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Aplica os mesmos limites de histórico em todos os provedores."""
    messages = [{"role": "system", "content": system_prompt}]
    history_budget = 24000
    selected = []
    for item in reversed(list(history or [])[-20:]):
        if not isinstance(item, Mapping) or item.get("role") not in {"user", "assistant"}:
            continue
        content = item.get("content")
        if not isinstance(content, str) or not content.strip():
            continue
        content = content[:6000]
        if len(content) > history_budget:
            break
        selected.append({"role": item["role"], "content": content})
        history_budget -= len(content)
    messages.extend(reversed(selected))
    messages.append({"role": "user", "content": user_prompt})
    return messages

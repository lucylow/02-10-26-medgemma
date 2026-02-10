from abc import ABC, abstractmethod
from .schemas import AgentContext

class BaseAgent(ABC):
    name: str

    @abstractmethod
    def run(self, ctx: AgentContext) -> AgentContext:
        ...

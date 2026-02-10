from abc import ABC, abstractmethod
from ..schemas.models import CasePayload, AgentResponse

class BaseAgent(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def role(self) -> str:
        pass

    @abstractmethod
    async def process(self, payload: CasePayload) -> AgentResponse:
        pass

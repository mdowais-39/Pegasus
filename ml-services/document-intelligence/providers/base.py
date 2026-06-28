from abc import ABC, abstractmethod
from schemas.document import DocumentIR

class DocumentProvider(ABC):
    @abstractmethod
    def extract(self, file_path: str) -> DocumentIR:
        pass

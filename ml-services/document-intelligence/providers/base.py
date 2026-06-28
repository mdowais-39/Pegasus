from abc import ABC, abstractmethod
from schemas.document import CanonicalDocument

class DocumentProvider(ABC):
    @abstractmethod
    def extract(self, file_path: str) -> CanonicalDocument:
        pass

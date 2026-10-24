from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class Actual:
    start_time: datetime
    generation: float


@dataclass(frozen=True)
class Forecast:
    start_time: datetime
    publish_time: datetime
    generation: float

    @property
    def horizon(self) -> timedelta:
        return self.start_time - self.publish_time

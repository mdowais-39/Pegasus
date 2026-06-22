from fastapi import FastAPI
from pydantic import BaseModel

from services.graph_builder import (
    GraphBuilder
)
from services.round_trip_detector import (
    RoundTripDetector
)
from services.money_flow_analyzer import (
    MoneyFlowAnalyzer
)

from services.investigation_service import (
    InvestigationService
)

from services.accumulation_detector import (
    AccumulationDetector
)

accumulation_detector = (
    AccumulationDetector()
)

investigator = InvestigationService()
money_flow = MoneyFlowAnalyzer()

round_trip_detector = RoundTripDetector()

app = FastAPI()

builder = GraphBuilder()


class BuildGraphRequest(
    BaseModel
):
    transactions: list


@app.get("/health")
def health():

    return {
        "service": "graph",
        "status": "healthy"
    }


@app.post("/build-graph")
def build_graph(
    request: BuildGraphRequest
):

    builder.build(
        request.transactions
    )

    return {
        "status": "success",
        "nodes_loaded":
            len(request.transactions)
    }

@app.get("/round-trips")
def round_trips():

    cycles = (
        round_trip_detector
        .detect_cycles()
    )

    return {

        "count":
            len(cycles),

        "cycles":
            cycles
    }
@app.get(
    "/money-flow/{account}"
)
def money_flow_trace(
    account: str
):

    paths = money_flow.trace(
        account
    )

    return {

        "source":
            account,

        "path_count":
            len(paths),

        "paths":
            paths
    }


@app.get(
    "/investigation/account/{account_id}"
)
def investigate_account(
    account_id: str
):

    return (
        investigator
        .investigate(
            account_id
        )
    )

@app.get(
    "/accumulation-accounts"
)
def accumulation_accounts():

    return {

        "accounts":
            accumulation_detector
            .top_accumulation_accounts()
    }
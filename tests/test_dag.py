import pytest

from backend_or_api.app.models import AgentNode, Edge, PipelineGraph
from backend_or_api.app.services.dag import topological_layers


def test_topological_linear_order() -> None:
    graph = PipelineGraph(
        nodes=[
            AgentNode(id="a", name="A", role="r"),
            AgentNode(id="b", name="B", role="r"),
        ],
        edges=[Edge(source="a", target="b")],
    )
    layers = topological_layers(graph)
    assert layers == [["a"], ["b"]]


def test_topological_parallel_layer() -> None:
    graph = PipelineGraph(
        nodes=[
            AgentNode(id="a", name="A", role="r"),
            AgentNode(id="b", name="B", role="r"),
            AgentNode(id="c", name="C", role="r"),
        ],
        edges=[
            Edge(source="a", target="b"),
            Edge(source="a", target="c"),
        ],
    )
    layers = topological_layers(graph)
    assert layers[0] == ["a"]
    assert set(layers[1]) == {"b", "c"}


def test_cycle_rejected() -> None:
    graph = PipelineGraph(
        nodes=[
            AgentNode(id="a", name="A", role="r"),
            AgentNode(id="b", name="B", role="r"),
        ],
        edges=[
            Edge(source="a", target="b"),
            Edge(source="b", target="a"),
        ],
    )
    with pytest.raises(ValueError, match="cycle"):
        topological_layers(graph)

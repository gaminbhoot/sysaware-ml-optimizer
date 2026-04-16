from collections import OrderedDict

import pytest

from core.model_analyzer import analyze_model


class FakeTensor:
    def __init__(self, numel: int, element_size: int, requires_grad: bool = True) -> None:
        self._numel = numel
        self._element_size = element_size
        self.requires_grad = requires_grad

    def numel(self) -> int:
        return self._numel

    def element_size(self) -> int:
        return self._element_size


class DummyModule:
    def __init__(self, parameters: list[FakeTensor], buffers: list[FakeTensor] | None = None) -> None:
        self._parameters = parameters
        self._buffers = buffers or []

    def parameters(self):
        return iter(self._parameters)

    def buffers(self):
        return iter(self._buffers)


class NoParamModule:
    def parameters(self):
        return iter([])

    def buffers(self):
        return iter([])


class ExplodingParametersModule:
    def parameters(self):
        raise RuntimeError("parameter access failed")


@pytest.mark.parametrize(
    "params,buffers,expected_params,expected_trainable,expected_size",
    [
        ([FakeTensor(10, 4)], [], 10, 10, 40 / (1024 ** 2)),
        ([FakeTensor(5, 2, requires_grad=False), FakeTensor(3, 4)], [], 8, 3, (10 + 12) / (1024 ** 2)),
        ([FakeTensor(1, 8)], [FakeTensor(2, 4)], 1, 1, (8 + 8) / (1024 ** 2)),
    ],
)
def test_analyze_model_counts_and_size_for_module_like_objects(
    params: list[FakeTensor],
    buffers: list[FakeTensor],
    expected_params: int,
    expected_trainable: int,
    expected_size: float,
) -> None:
    analysis = analyze_model(DummyModule(params, buffers))
    assert analysis["model_name"] == "DummyModule"
    assert analysis["num_params"] == expected_params
    assert analysis["trainable_params"] == expected_trainable
    assert analysis["size_mb"] == pytest.approx(expected_size, rel=1e-6)


@pytest.mark.parametrize(
    "state_dict,expected_params,expected_size",
    [
        (OrderedDict([("layer.weight", FakeTensor(4, 4)), ("layer.bias", FakeTensor(2, 2))]), 6, (16 + 4) / (1024 ** 2)),
        ({"a": FakeTensor(3, 8), "b": FakeTensor(0, 4)}, 3, 24 / (1024 ** 2)),
        ({"a": FakeTensor(7, 1, requires_grad=False)}, 7, 7 / (1024 ** 2)),
    ],
)
def test_analyze_model_supports_tensor_mappings(
    state_dict: dict[str, FakeTensor],
    expected_params: int,
    expected_size: float,
) -> None:
    analysis = analyze_model(state_dict)
    assert analysis["model_name"] in {"dict", "OrderedDict"}
    assert analysis["num_params"] == expected_params
    assert analysis["trainable_params"] == 0
    assert analysis["size_mb"] == pytest.approx(expected_size, rel=1e-6)


@pytest.mark.parametrize(
    "model_object",
    [
        None,
        "not a model",
        123,
        object(),
    ],
)
def test_analyze_model_rejects_unsupported_inputs(model_object: object) -> None:
    with pytest.raises(ValueError, match="Unsupported model type|Model cannot be None"):
        analyze_model(model_object)


def test_analyze_model_rejects_parameter_access_failures() -> None:
    with pytest.raises(ValueError, match="Unable to read model parameters"):
        analyze_model(ExplodingParametersModule())


def test_analyze_model_handles_model_with_no_parameters() -> None:
    analysis = analyze_model(NoParamModule())
    assert analysis["model_name"] == "NoParamModule"
    assert analysis["num_params"] == 0
    assert analysis["trainable_params"] == 0
    assert analysis["size_mb"] == 0.0


def test_analyze_model_ignores_non_tensor_values_in_mapping() -> None:
    analysis = analyze_model({"good": FakeTensor(5, 4), "bad": "skip me"})
    assert analysis["num_params"] == 5
    assert analysis["size_mb"] == pytest.approx(20 / (1024 ** 2), rel=1e-6)


def test_analyze_model_rejects_tuple_collections() -> None:
    analysis = analyze_model((FakeTensor(2, 4), FakeTensor(3, 2, requires_grad=False)))
    assert analysis["num_params"] == 5
    assert analysis["size_mb"] == pytest.approx((8 + 6) / (1024 ** 2), rel=1e-6)


def test_analyze_model_preserves_small_size_precision() -> None:
    analysis = analyze_model(DummyModule([FakeTensor(1, 1)]))
    assert analysis["size_mb"] == pytest.approx(1 / (1024 ** 2), rel=1e-6)


def test_analyze_model_counts_buffers_in_size_only() -> None:
    analysis = analyze_model(DummyModule([FakeTensor(4, 4)], [FakeTensor(100, 8)]))
    assert analysis["num_params"] == 4
    assert analysis["trainable_params"] == 4
    assert analysis["size_mb"] == pytest.approx((16 + 800) / (1024 ** 2), rel=1e-6)

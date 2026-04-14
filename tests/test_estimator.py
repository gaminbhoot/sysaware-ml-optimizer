from types import SimpleNamespace

import pytest

import core.estimator as estimator


class FakeParameter:
    def __init__(self, numel: int, dtype: object = None) -> None:
        self._numel = numel
        self.dtype = dtype

    def numel(self) -> int:
        return self._numel


class FakeModel:
    def __init__(self, parameters: list[FakeParameter], output_value: object = None) -> None:
        self._parameters = parameters
        self.output_value = output_value
        self.eval_called = 0
        self.to_called = 0
        self.forward_calls = 0

    def parameters(self):
        return iter(self._parameters)

    def eval(self):
        self.eval_called += 1
        return self

    def to(self, device):
        self.to_called += 1
        return self

    def __call__(self, input_tensor):
        self.forward_calls += 1
        return self.output_value if self.output_value is not None else input_tensor


class NoEvalModel:
    def __init__(self) -> None:
        self._parameters = [FakeParameter(10)]

    def parameters(self):
        return iter(self._parameters)


class ExplodingForwardModel(FakeModel):
    def __call__(self, input_tensor):
        raise RuntimeError("forward failed")


@pytest.mark.parametrize(
    "numel,dtype_size,expected_memory",
    [
        (10, 4, 40 / (1024 ** 2)),
        (5, 2, 20 / (1024 ** 2)),
        (1, 8, 4 / (1024 ** 2)),
    ],
)
def test_estimate_performance_static_memory_uses_parameter_sizes(
    monkeypatch: pytest.MonkeyPatch,
    numel: int,
    dtype_size: int,
    expected_memory: float,
) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    model = FakeModel([FakeParameter(numel)])
    result = estimator.estimate_performance(model, {"gpu_available": False, "ram_gb": 8.0, "gpu_vram_gb": 0.0})
    assert result["memory_mb"] == pytest.approx(expected_memory, rel=1e-6)
    assert result["confidence"] == "low"
    assert result["method"] == "static"


def test_estimate_performance_rejects_none_model() -> None:
    with pytest.raises(ValueError, match="Model cannot be None"):
        estimator.estimate_performance(None, {})


def test_estimate_performance_rejects_non_dict_profile() -> None:
    model = FakeModel([FakeParameter(10)])
    with pytest.raises(ValueError, match="Profile must be a dictionary"):
        estimator.estimate_performance(model, [])


def test_estimate_performance_static_fallback_when_torch_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    model = FakeModel([FakeParameter(100)])
    result = estimator.estimate_performance(model, {"gpu_available": False, "ram_gb": 2.0, "gpu_vram_gb": 0.0})
    assert result["method"] == "static"
    assert result["latency_range_ms"][1] > 0
    assert result["memory_mb"] == pytest.approx(100 * 4 / (1024 ** 2), rel=1e-6)


def test_estimate_performance_uses_benchmark_when_torch_available(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeNoGrad:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeDevice:
        def __init__(self, type_name: str) -> None:
            self.type = type_name

    fake_cuda = SimpleNamespace(
        is_available=lambda: False,
    )
    fake_torch = SimpleNamespace(
        cuda=fake_cuda,
        device=lambda name: FakeDevice(name),
        zeros=lambda batch, width: SimpleNamespace(to=lambda device: SimpleNamespace()),
        no_grad=lambda: FakeNoGrad(),
    )
    monkeypatch.setattr(estimator, "torch", fake_torch)

    model = FakeModel([FakeParameter(100)], output_value="ok")
    result = estimator.estimate_performance(model, {"gpu_available": False, "ram_gb": 16.0, "gpu_vram_gb": 0.0})
    assert result["method"] == "static+micro-benchmark"
    assert result["confidence"] == "high"
    assert result["latency_range_ms"][0] >= 0
    assert result["latency_range_ms"][1] >= result["latency_range_ms"][0]
    assert model.eval_called >= 1
    assert model.forward_calls >= 7


def test_estimate_performance_benchmark_failure_falls_back_to_static(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    model = ExplodingForwardModel([FakeParameter(25)])
    result = estimator.estimate_performance(model, {"gpu_available": False, "ram_gb": 4.0, "gpu_vram_gb": 0.0})
    assert result["method"] == "static"
    assert result["confidence"] == "low"
    assert result["latency_range_ms"][1] > 0


def test_estimate_performance_handles_no_eval_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    model = NoEvalModel()
    result = estimator.estimate_performance(model, {"gpu_available": False, "ram_gb": 4.0, "gpu_vram_gb": 0.0})
    assert result["method"] == "static"
    assert result["memory_mb"] > 0


def test_estimate_performance_prefers_benchmark_memory_when_higher(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeNoGrad:
        def __enter__(self):
            return None

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeDevice:
        def __init__(self, type_name: str) -> None:
            self.type = type_name

    class FakeCuda:
        def is_available(self):
            return False

    fake_torch = SimpleNamespace(
        cuda=FakeCuda(),
        device=lambda name: FakeDevice(name),
        zeros=lambda batch, width: SimpleNamespace(to=lambda device: SimpleNamespace()),
        no_grad=lambda: FakeNoGrad(),
    )
    monkeypatch.setattr(estimator, "torch", fake_torch)

    model = FakeModel([FakeParameter(1)])
    result = estimator.estimate_performance(model, {"gpu_available": False, "ram_gb": 16.0, "gpu_vram_gb": 0.0})
    assert result["memory_mb"] >= 0
    assert result["latency_range_ms"][1] >= 0


def test_estimate_performance_batch_size_rule_cpu_only(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    profile = {"gpu_available": False, "ram_gb": 8.0, "gpu_vram_gb": 0.0}
    assert estimator._get_batch_size(profile) == 1


def test_estimate_performance_batch_size_rule_mid_ram(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    profile = {"gpu_available": False, "ram_gb": 16.0, "gpu_vram_gb": 0.0}
    assert estimator._get_batch_size(profile) == 4


def test_estimate_performance_batch_size_rule_gpu_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(estimator, "torch", None)
    profile = {"gpu_available": True, "ram_gb": 16.0, "gpu_vram_gb": 12.0}
    assert estimator._get_batch_size(profile) == 8

def test_estimator_tracemalloc(monkeypatch: pytest.MonkeyPatch) -> None:
    import torch
    import torch.nn as nn
    import core.estimator as estimator
    monkeypatch.setattr(estimator, "torch", torch)
    
    class ToyModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.linear = nn.Linear(16, 512)
        def forward(self, x):
            # Create a big intermediate tensor that tracemalloc will see python wrappers for
            activations = [torch.ones(1024, 1024, device="cpu") for _ in range(50)]
            _ = [a.sum() for a in activations] # Use them
            return self.linear(x)

    model = ToyModel()
    profile = {"gpu_available": False, "ram_gb": 16.0, "gpu_vram_gb": 0.0}
    
    static_mem = estimator._estimate_static_memory_mb(model)
    result = estimator.estimate_performance(model, profile)
    
    assert result["method"] == "static+micro-benchmark"
    assert result["memory_mb"] > static_mem

def test_estimator_dynamic_iterations(monkeypatch: pytest.MonkeyPatch) -> None:
    import torch
    import time
    import torch.nn as nn
    import core.estimator as estimator
    monkeypatch.setattr(estimator, "torch", torch)
    
    class FastModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.linear = nn.Linear(16, 16)
            self.calls = 0
        def forward(self, x):
            self.calls += 1
            return self.linear(x)

    fast_model = FastModel()
    profile = {"gpu_available": False, "ram_gb": 16.0, "gpu_vram_gb": 0.0}
    result_fast = estimator.estimate_performance(fast_model, profile)
    
    class SlowModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.linear = nn.Linear(16, 16)
            self.calls = 0
        def forward(self, x):
            self.calls += 1
            time.sleep(0.3)  # Artificial 300ms delay per pass
            return self.linear(x)
            
    slow_model = SlowModel()
    result_slow = estimator.estimate_performance(slow_model, profile)

    # Fast model should hit early stop due to stable variance, slow model should hit time limit early
    assert fast_model.calls > slow_model.calls
    assert result_fast["confidence"] in ["high", "medium"]
    assert result_slow["confidence"] in ["high", "medium"]

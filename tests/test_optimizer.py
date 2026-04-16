from types import SimpleNamespace

import pytest

import core.optimizer as optimizer


class FakeQuantizableLinear:
    pass

class FakeQuantizableConv1d: pass
class FakeQuantizableConv2d: pass
class FakeQuantizableConv3d: pass
class FakeQuantizableLSTM: pass
class FakeQuantizableGRU: pass

class FakeModel:
    def __init__(self) -> None:
        self.to_calls: list[str] = []
        self.half_calls = 0
        self.deepcopied = 0
        self.quantized = False

    def __deepcopy__(self, memo):
        self.deepcopied += 1
        return self

    def to(self, device: str):
        self.to_calls.append(device)
        return self

    def half(self):
        self.half_calls += 1
        return self


class ExplodingModel(FakeModel):
    def half(self):
        raise RuntimeError("half failed")


@pytest.fixture
def fake_torch(monkeypatch: pytest.MonkeyPatch):
    fake_cuda = SimpleNamespace(is_available=lambda: False)
    fake_quantization = SimpleNamespace()
    fake_nn = SimpleNamespace(
        Linear=FakeQuantizableLinear,
        Conv1d=FakeQuantizableConv1d,
        Conv2d=FakeQuantizableConv2d,
        Conv3d=FakeQuantizableConv3d,
        LSTM=FakeQuantizableLSTM,
        GRU=FakeQuantizableGRU,
    )
    fake_module = SimpleNamespace(cuda=fake_cuda, quantization=fake_quantization, nn=fake_nn, qint8="qint8")
    monkeypatch.setattr(optimizer, "torch", fake_module)
    return fake_module


def test_no_op_optimization_returns_same_model_and_metadata() -> None:
    model = FakeModel()
    optimized_model, metadata = optimizer.no_op_optimization(model)
    assert optimized_model is model
    assert metadata["method"] == "none"
    assert metadata["applied"] is False
    assert metadata["device"] == "unchanged"
    assert metadata["skipped_reasons"]


@pytest.mark.parametrize("mode", ["none", "NONE", " None ".strip()])
def test_optimize_model_none_mode_returns_no_op(fake_torch, mode: str) -> None:
    model = FakeModel()
    optimized_model, metadata = optimizer.optimize_model(model, {"gpu_available": False}, mode=mode)
    assert optimized_model is model
    assert metadata["method"] == "none"
    assert metadata["applied"] is False


def test_optimize_model_rejects_invalid_mode(fake_torch) -> None:
    with pytest.raises(ValueError, match="Unsupported optimization mode"):
        optimizer.optimize_model(FakeModel(), {"gpu_available": False}, mode="fast")


def test_optimize_model_rejects_none_model(fake_torch) -> None:
    with pytest.raises(ValueError, match="Model cannot be None"):
        optimizer.optimize_model(None, {"gpu_available": False})


def test_optimize_model_rejects_invalid_profile(fake_torch) -> None:
    with pytest.raises(ValueError, match="Profile must be a dictionary"):
        optimizer.optimize_model(FakeModel(), [], mode="int8")


def test_int8_quantization_uses_torch_quantize_dynamic(monkeypatch: pytest.MonkeyPatch, fake_torch) -> None:
    called = {}

    def quantize_dynamic(model, qconfig, dtype=None):
        called["model"] = model
        called["qconfig"] = qconfig
        called["dtype"] = dtype
        model.quantized = True
        return model

    fake_torch.quantization.quantize_dynamic = quantize_dynamic
    model = FakeModel()
    optimized_model, metadata = optimizer.apply_int8_quantization(model)

    assert optimized_model is model
    assert metadata["method"] == "int8"
    assert metadata["applied"] is True
    assert metadata["device"] == "cpu"
    assert called["dtype"] == "qint8"
    assert FakeQuantizableLinear in called["qconfig"]
    assert model.quantized is True

def test_int8_conv_rnn(monkeypatch: pytest.MonkeyPatch, fake_torch) -> None:
    called = {}
    def quantize_dynamic(model, qconfig, dtype=None):
        called["qconfig"] = qconfig
        return model

    fake_torch.quantization.quantize_dynamic = quantize_dynamic
    model = FakeModel()
    
    optimized_model, metadata = optimizer.apply_int8_quantization(model)
    assert metadata["applied"] is True
    
    qset = called["qconfig"]
    assert FakeQuantizableConv1d in qset
    assert FakeQuantizableConv2d in qset
    assert FakeQuantizableConv3d in qset
    assert FakeQuantizableLSTM in qset
    assert FakeQuantizableGRU in qset


def test_int8_quantization_falls_back_when_torch_quantization_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_torch = SimpleNamespace(cuda=SimpleNamespace(is_available=lambda: False), nn=SimpleNamespace(Linear=FakeQuantizableLinear), qint8="qint8")
    monkeypatch.setattr(optimizer, "torch", fake_torch)
    model = FakeModel()
    optimized_model, metadata = optimizer.apply_int8_quantization(model)

    assert optimized_model is model
    assert metadata["method"] == "int8"
    assert metadata["applied"] is False
    assert metadata["skipped_reasons"]


def test_int8_quantization_handles_internal_failure(monkeypatch: pytest.MonkeyPatch, fake_torch) -> None:
    def quantize_dynamic(model, qconfig, dtype=None):
        raise RuntimeError("quantization failed")

    fake_torch.quantization.quantize_dynamic = quantize_dynamic
    model = FakeModel()
    optimized_model, metadata = optimizer.apply_int8_quantization(model)

    assert optimized_model is model
    assert metadata["applied"] is False
    assert "quantization failed" in metadata["skipped_reasons"][0]


def test_fp16_conversion_returns_no_op_on_cpu_only(fake_torch) -> None:
    model = FakeModel()
    optimized_model, metadata = optimizer.convert_to_fp16(model, {"gpu_available": False})
    assert optimized_model is model
    assert metadata["method"] == "fp16"
    assert metadata["applied"] is False
    assert metadata["device"] == "cpu"


def test_fp16_conversion_requires_cuda_available(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_torch = SimpleNamespace(
        cuda=SimpleNamespace(is_available=lambda: False),
    )
    monkeypatch.setattr(optimizer, "torch", fake_torch)
    model = FakeModel()
    optimized_model, metadata = optimizer.convert_to_fp16(model, {"gpu_available": True})
    assert optimized_model is model
    assert metadata["applied"] is False
    assert metadata["skipped_reasons"]


def test_fp16_conversion_uses_to_and_half_when_cuda_available(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_torch = SimpleNamespace(
        cuda=SimpleNamespace(is_available=lambda: True),
    )
    monkeypatch.setattr(optimizer, "torch", fake_torch)
    model = FakeModel()
    optimized_model, metadata = optimizer.convert_to_fp16(model, {"gpu_available": True})

    assert optimized_model is model
    assert metadata["method"] == "fp16"
    assert metadata["applied"] is True
    assert metadata["device"] == "cuda"
    assert model.to_calls == ["cuda"]
    assert model.half_calls == 1


def test_fp16_conversion_uses_mps_when_available(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_torch = SimpleNamespace(
        cuda=SimpleNamespace(is_available=lambda: False),
        backends=SimpleNamespace(mps=SimpleNamespace(is_available=lambda: True)),
    )
    monkeypatch.setattr(optimizer, "torch", fake_torch)
    model = FakeModel()
    optimized_model, metadata = optimizer.convert_to_fp16(model, {"gpu_available": True, "gpu_backend": "mps"})

    assert optimized_model is model
    assert metadata["method"] == "fp16"
    assert metadata["applied"] is True
    assert metadata["device"] == "mps"
    assert model.to_calls == ["mps"]
    assert model.half_calls == 1


def test_fp16_conversion_handles_internal_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_torch = SimpleNamespace(
        cuda=SimpleNamespace(is_available=lambda: True),
    )
    monkeypatch.setattr(optimizer, "torch", fake_torch)
    model = ExplodingModel()
    optimized_model, metadata = optimizer.convert_to_fp16(model, {"gpu_available": True})

    assert optimized_model is model
    assert metadata["applied"] is False
    assert metadata["skipped_reasons"]


def test_fp16_conversion_rejects_invalid_profile(fake_torch) -> None:
    with pytest.raises(ValueError, match="Profile must be a dictionary"):
        optimizer.convert_to_fp16(FakeModel(), None)


def test_oom_prevention_clone(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []
    
    class ModelWithoutSave(FakeModel):
        pass

    fake_torch = SimpleNamespace(
        save=lambda model, path: calls.append("save"),
        load=lambda path, map_location, weights_only=False: "cloned_model"
    )
    monkeypatch.setattr(optimizer, "torch", fake_torch)
    
    # Successful disk clone
    model = ModelWithoutSave()
    cloned = optimizer._clone_model(model)
    assert cloned == "cloned_model"
    assert calls == ["save"]

    # Failed disk clone fallback
    fake_torch_broken = SimpleNamespace(
        save=lambda model, path: (_ for _ in ()).throw(RuntimeError("disk full")),
        load=lambda path, map_location, weights_only=False: model
    )
    monkeypatch.setattr(optimizer, "torch", fake_torch_broken)
    cloned2 = optimizer._clone_model(model)
    assert cloned2 is model


def test_state_dict_handling(fake_torch) -> None:
    state_dict = {"layer.weight": "tensor"}
    
    # INT8
    model, meta_int8 = optimizer.apply_int8_quantization(state_dict)
    assert model is state_dict
    assert meta_int8["applied"] is False
    assert "Direct optimization of state dictionaries" in meta_int8["skipped_reasons"][0]
    
    # FP16
    model, meta_fp16 = optimizer.convert_to_fp16(state_dict, {"gpu_available": True})
    assert model is state_dict
    assert meta_fp16["applied"] is False
    assert "Direct optimization of state dictionaries" in meta_fp16["skipped_reasons"][0]


def test_supported_modes_include_expected_values() -> None:
    assert optimizer.SUPPORTED_MODES == {"int8", "fp16", "none"}

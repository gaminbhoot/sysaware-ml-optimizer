from types import SimpleNamespace

import pytest

import core.system_profiler as sp


@pytest.fixture
def reset_profiler_deps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sp, "psutil", None)
    monkeypatch.setattr(sp, "torch", None)
    
    import subprocess
    def fake_check_output(*args, **kwargs):
        raise OSError("Mocked subprocess failure")
    monkeypatch.setattr(subprocess, "check_output", fake_check_output)


def test_get_system_profile_has_expected_keys(reset_profiler_deps: None) -> None:
    profile = sp.get_system_profile()
    assert set(profile.keys()) == {
        "os",
        "cpu_cores",
        "ram_gb",
        "ram_available_gb",
        "gpu_available",
        "gpu_backend",
        "gpu_name",
        "gpu_vram_gb",
        "dgpu_name",
        "dgpu_vram_gb",
        "igpu_name",
        "igpu_vram_gb",
        "npu_available",
        "npu_name",
        "bandwidth_gb_s",
        "tflops_fp16",
    }


def test_cpu_only_with_psutil(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_psutil = SimpleNamespace(
        cpu_count=lambda logical=False: 8 if not logical else 16,
        virtual_memory=lambda: SimpleNamespace(total=16 * 1024**3),
    )
    monkeypatch.setattr(sp, "psutil", fake_psutil)

    profile = sp.get_system_profile()
    assert profile["cpu_cores"] == 8
    assert profile["ram_gb"] == 16.0
    assert profile["gpu_available"] is False
    assert profile["gpu_name"] == "None"


def test_gpu_available_path(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_psutil = SimpleNamespace(
        cpu_count=lambda logical=False: 4,
        virtual_memory=lambda: SimpleNamespace(total=8 * 1024**3),
    )
    fake_cuda = SimpleNamespace(
        is_available=lambda: True,
        current_device=lambda: 0,
        get_device_properties=lambda idx: SimpleNamespace(name="RTX 4090", total_memory=24 * 1024**3),
    )
    fake_torch = SimpleNamespace(cuda=fake_cuda)
    monkeypatch.setattr(sp, "psutil", fake_psutil)
    monkeypatch.setattr(sp, "torch", fake_torch)

    profile = sp.get_system_profile()
    assert profile["gpu_available"] is True
    assert profile["gpu_name"] == "RTX 4090"
    assert profile["gpu_vram_gb"] == 24.0


def test_gpu_current_device_failure_falls_back_to_zero(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    calls = {"idx": None}

    def get_props(idx: int) -> SimpleNamespace:
        calls["idx"] = idx
        return SimpleNamespace(name="GPU-X", total_memory=4 * 1024**3)

    fake_cuda = SimpleNamespace(
        is_available=lambda: True,
        current_device=lambda: (_ for _ in ()).throw(RuntimeError("no current device")),
        get_device_properties=get_props,
    )
    monkeypatch.setattr(sp, "torch", SimpleNamespace(cuda=fake_cuda))

    profile = sp.get_system_profile()
    assert profile["gpu_available"] is True
    assert calls["idx"] == 0


def test_gpu_query_failure_does_not_crash(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_cuda = SimpleNamespace(
        is_available=lambda: True,
        current_device=lambda: 0,
        get_device_properties=lambda idx: (_ for _ in ()).throw(RuntimeError("cuda failure")),
    )
    monkeypatch.setattr(sp, "torch", SimpleNamespace(cuda=fake_cuda))

    profile = sp.get_system_profile()
    assert profile["gpu_available"] is False
    assert profile["gpu_name"] == "None"
    assert profile["gpu_vram_gb"] == 0.0


def test_is_available_exception_does_not_crash(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_cuda = SimpleNamespace(
        is_available=lambda: (_ for _ in ()).throw(RuntimeError("cuda unavailable")),
    )
    monkeypatch.setattr(sp, "torch", SimpleNamespace(cuda=fake_cuda))

    profile = sp.get_system_profile()
    assert profile["gpu_available"] is False


def test_cpu_count_none_falls_back_to_os_cpu_count(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_psutil = SimpleNamespace(
        cpu_count=lambda logical=False: None,
        virtual_memory=lambda: SimpleNamespace(total=2 * 1024**3),
    )
    monkeypatch.setattr(sp, "psutil", fake_psutil)
    monkeypatch.setattr(sp.os, "cpu_count", lambda: 6)

    profile = sp.get_system_profile()
    assert profile["cpu_cores"] == 6


def test_cpu_count_fallback_minimum_one(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_psutil = SimpleNamespace(
        cpu_count=lambda logical=False: None,
        virtual_memory=lambda: SimpleNamespace(total=0),
    )
    monkeypatch.setattr(sp, "psutil", fake_psutil)
    monkeypatch.setattr(sp.os, "cpu_count", lambda: 0)

    profile = sp.get_system_profile()
    assert profile["cpu_cores"] == 1


def test_virtual_memory_failure_keeps_ram_default(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_psutil = SimpleNamespace(
        cpu_count=lambda logical=False: 2,
        virtual_memory=lambda: (_ for _ in ()).throw(RuntimeError("ram probe error")),
    )
    monkeypatch.setattr(sp, "psutil", fake_psutil)

    profile = sp.get_system_profile()
    assert profile["ram_gb"] == 0.0


def test_platform_failure_keeps_unknown_os(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sp.platform, "system", lambda: (_ for _ in ()).throw(RuntimeError("os fail")))
    monkeypatch.setattr(sp.platform, "release", lambda: "ignore")

    profile = sp.get_system_profile()
    assert profile["os"] == "Unknown"


def test_normal_os_contains_system_and_release(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sp.platform, "system", lambda: "Windows")
    monkeypatch.setattr(sp.platform, "release", lambda: "11")

    profile = sp.get_system_profile()
    assert profile["os"] == "Windows 11"

def test_system_profiler_mps(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_psutil = SimpleNamespace(
        cpu_count=lambda logical=False: 8,
        virtual_memory=lambda: SimpleNamespace(total=16 * 1024**3, available=10 * 1024**3),
    )
    fake_mps = SimpleNamespace(is_available=lambda: True)
    fake_backends = SimpleNamespace(mps=fake_mps)
    fake_torch = SimpleNamespace(backends=fake_backends, cuda=SimpleNamespace(is_available=lambda: False))
    
    monkeypatch.setattr(sp, "psutil", fake_psutil)
    monkeypatch.setattr(sp, "torch", fake_torch)

    profile = sp.get_system_profile()
    assert profile["gpu_available"] is True
    assert profile["gpu_name"] == "Apple Silicon MPS"
    assert profile["gpu_vram_gb"] == 10.0
    assert profile["ram_gb"] == 16.0
    assert profile["gpu_backend"] == "mps"


def test_darwin_npu_detection_requires_explicit_probe(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sp.platform, "system", lambda: "Darwin")

    import subprocess
    from types import SimpleNamespace

    def fake_run(cmd, *args, **kwargs):
        if "ioreg" in cmd:
            return SimpleNamespace(returncode=0, stdout="+-o AppleANE  <class AppleANE, id 0x100000>")
        raise OSError("unexpected command")

    monkeypatch.setattr(subprocess, "run", fake_run)

    profile = sp.get_system_profile()
    assert profile["npu_available"] is True
    assert profile["npu_name"] == "Apple Neural Engine"


def test_darwin_npu_detection_no_probe_hit(reset_profiler_deps: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sp.platform, "system", lambda: "Darwin")

    import subprocess
    from types import SimpleNamespace

    def fake_run(cmd, *args, **kwargs):
        if "ioreg" in cmd:
            return SimpleNamespace(returncode=0, stdout="no ane signal")
        raise OSError("unexpected command")

    monkeypatch.setattr(subprocess, "run", fake_run)

    profile = sp.get_system_profile()
    assert profile["npu_available"] is False
    assert profile["npu_name"] == "None"

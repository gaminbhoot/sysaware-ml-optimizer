import torch
import torch.nn as nn

def test_save():
    class DummyModelLocal(nn.Module):
        def __init__(self):
            super().__init__()
            self.fc = nn.Linear(10, 10)
    model = DummyModelLocal()
    torch.save(model, "test.pt")

test_save()

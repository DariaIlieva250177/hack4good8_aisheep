import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FINGERPRINT = """
import hashlib, sys
sys.path.insert(0, "src")
from synthetic_data import CONFIG, build_all
tables, _ = build_all("data/risk-radar-export.csv", CONFIG)
print(hashlib.sha256("".join(t.to_csv(index=False) for t in tables.values()).encode()).hexdigest())
"""


def fingerprint(hash_seed):
    env = {**os.environ, "PYTHONHASHSEED": hash_seed, "PYTHONDONTWRITEBYTECODE": "1"}
    return subprocess.run([sys.executable, "-c", FINGERPRINT], cwd=ROOT, env=env, capture_output=True,
                          text=True, check=True).stdout.strip()


def test_the_same_seed_gives_the_same_data_in_every_python_process():
    assert fingerprint("1") == fingerprint("2")
#!/usr/bin/env python3
"""Generate self-made placeholder samples (public/sounds/*.wav).

These are synthesized from scratch (no third-party audio) and are meant to be
replaced with real recorded voices. Run: python3 scripts/generate-placeholder-sounds.py
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "sounds"


def write(name, samples):
    peak = max(abs(x) for x in samples) or 1
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(
            b"".join(struct.pack("<h", int(x / peak * 0.9 * 32767)) for x in samples)
        )


def cak():
    # Short, bright, noisy "cak": band-limited noise burst + formant-ish tone.
    rng = random.Random(1)
    n = int(RATE * 0.11)
    out, lp = [], 0.0
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * 38) * min(1.0, t * 800)
        lp += 0.55 * (rng.uniform(-1, 1) - lp)
        tone = math.sin(2 * math.pi * 1500 * t) * 0.5 + math.sin(2 * math.pi * 2400 * t) * 0.25
        out.append((lp * 0.8 + tone) * env)
    return out


def pung():
    # Low, round "pung": decaying sine with a quick pitch drop.
    n = int(RATE * 0.32)
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        freq = 150 + 90 * math.exp(-t * 40)
        phase += 2 * math.pi * freq / RATE
        env = math.exp(-t * 11) * min(1.0, t * 500)
        out.append((math.sin(phase) + 0.3 * math.sin(2 * phase)) * env)
    return out


write("cak-01.wav", cak())
write("pung-01.wav", pung())
print("wrote", OUT)

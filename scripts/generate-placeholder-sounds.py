#!/usr/bin/env python3
"""Generate self-made placeholder samples (public/sounds/*.wav).

Synthesized from scratch (no third-party audio); meant to be replaced with
recorded voices. Each family has several takes for round-robin variation.
  cak-short-01..03  short "cak" attack
  cak-long-01..02   sustained "caaak" (consonant + held vowel + release)
  pung-01           low pung
Run: python3 scripts/generate-placeholder-sounds.py
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


def cak_short(seed, f1, f2, decay):
    rng = random.Random(seed)
    n = int(RATE * 0.11)
    out, lp = [], 0.0
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * decay) * min(1.0, t * 800)
        lp += 0.55 * (rng.uniform(-1, 1) - lp)
        tone = math.sin(2 * math.pi * f1 * t) * 0.5 + math.sin(2 * math.pi * f2 * t) * 0.25
        out.append((lp * 0.8 + tone) * env)
    return out


def cak_long(seed, f0, vib):
    """Noisy attack, then a held vowel-like tone (harmonics shaped by 2 formants), long tail."""
    rng = random.Random(seed)
    dur = 1.6
    n = int(RATE * dur)
    out, lp, phase = [], 0.0, 0.0
    for i in range(n):
        t = i / RATE
        # consonant burst (first ~35 ms)
        burst = math.exp(-t * 60) * rng.uniform(-1, 1)
        lp += 0.5 * (burst - lp)
        # held vowel: harmonics weighted around formants ~800 / 1300 Hz
        f = f0 * (1 + 0.012 * math.sin(2 * math.pi * vib * t))
        phase += 2 * math.pi * f / RATE
        vowel = 0.0
        for h in range(1, 14):
            hf = f0 * h
            w = math.exp(-((hf - 800) / 350) ** 2) + 0.6 * math.exp(-((hf - 1300) / 400) ** 2)
            vowel += w * math.sin(h * phase) / h
        env = min(1.0, t * 90) * (1.0 if t < 1.1 else math.exp(-(t - 1.1) * 7))
        out.append(lp * 1.2 + vowel * 0.9 * env)
    return out


def pung():
    n = int(RATE * 0.32)
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        freq = 150 + 90 * math.exp(-t * 40)
        phase += 2 * math.pi * freq / RATE
        env = math.exp(-t * 11) * min(1.0, t * 500)
        out.append((math.sin(phase) + 0.3 * math.sin(2 * phase)) * env)
    return out


write("cak-short-01.wav", cak_short(1, 1500, 2400, 38))
write("cak-short-02.wav", cak_short(2, 1380, 2250, 42))
write("cak-short-03.wav", cak_short(3, 1650, 2550, 35))
write("cak-long-01.wav", cak_long(11, 190, 5.2))
write("cak-long-02.wav", cak_long(12, 210, 4.6))
write("pung-01.wav", pung())
print("wrote", OUT)

"""Read-only independent execution proof for equipment's Hunter ID copy.

Run with Instrumented Python (Unicorn + Capstone), optionally passing original
libnative_core.so. No library writes, APK build or native UI calls occur.
"""
import hashlib
import sys
from pathlib import Path
from capstone import Cs, CS_ARCH_ARM, CS_MODE_THUMB
from unicorn import Uc, UC_ARCH_ARM, UC_MODE_THUMB
from unicorn.arm_const import *

source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "Blustone-DataDump/local/inputs/extracted/lib/armeabi-v7a/libnative_core.so"
binary = source.read_bytes()
assert hashlib.sha256(binary).hexdigest() == "c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec"
md = Cs(CS_ARCH_ARM, CS_MODE_THUMB)
for entry, call in [(0x86aaac, 0x86aac8), (0x86abb8, 0x86abd4)]:
    instructions = list(md.disasm(binary[entry:call + 4], entry))
    assert instructions[-1].address == call
    assert instructions[-1].mnemonic == "bl" and instructions[-1].op_str == "#0x6c7efc"
    # Before copy: r0 becomes local destination. The incoming this pointer in
    # r1 is preserved; no MOV/LDR to r1, and no intervening function call.
    assert not any(i.mnemonic.startswith("bl") for i in instructions[:-1])
    assert not any(i.op_str.startswith("r1,") and i.mnemonic in ("mov", "movs", "ldr", "add", "adds") for i in instructions[:-1])

# Execute actual copy constructor's short-string branch, including VFP load /
# store. libc++ ARM string represents length3 as first byte6, followed by ID.
for text in ["001", "004", "072", "x914", "004_1"]:
    emu = Uc(UC_ARCH_ARM, UC_MODE_THUMB)
    emu.mem_map(0x6c7000, 0x2000)
    emu.mem_write(0x6c7efc, binary[0x6c7efc:0x6c7f72])
    emu.mem_map(0x20000000, 0x10000)
    emu.mem_map(0x30000000, 0x1000)
    original = (bytes([len(text) * 2]) + text.encode() + b"\0").ljust(12, b"\0")
    emu.mem_write(0x20000000, original)
    emu.reg_write(UC_ARM_REG_R0, 0x20000020)
    emu.reg_write(UC_ARM_REG_R1, 0x20000000)
    emu.reg_write(UC_ARM_REG_SP, 0x2000fff0)
    emu.reg_write(UC_ARM_REG_LR, 0x30000001)
    emu.reg_write(UC_ARM_REG_C1_C0_2, 0xf << 20)
    emu.reg_write(UC_ARM_REG_FPEXC, 1 << 30)
    emu.emu_start(0x6c7efd, 0x30000000, count=100)
    assert bytes(emu.mem_read(0x20000020, 12)) == original
    assert bytes(emu.mem_read(0x20000000, 12)) == original
print("Pinned original native equipment copy calls and five actual Thumb/VFP Hunter-ID copy cases passed.")

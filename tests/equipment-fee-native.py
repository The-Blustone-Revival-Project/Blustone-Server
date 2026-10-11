"""Execute pinned original CalcBonusSaleValue, stubbing only benefit lookup."""
import hashlib
import struct
import sys
from pathlib import Path
from unicorn import Uc, UC_ARCH_ARM, UC_MODE_THUMB, UC_HOOK_CODE
from unicorn.arm_const import *

source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "Blustone-DataDump/local/inputs/extracted/lib/armeabi-v7a/libnative_core.so"
binary = source.read_bytes()
assert hashlib.sha256(binary).hexdigest() == "c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec"
assert struct.unpack_from("<f", binary, 0xa6ff80)[0] == 1000.0

cases = [(price, None, None, price) for price in [0, 1, 17, 16777217, 0xffffffff]] + [
    (101, 1, 950, 95), (101, 1, 500, 50), (100, 1, 0, 0),
    (16777217, 1, 1000, 16777216), (0xffffffff, 1, 1000, 0xffffffff),
    (0xffffffff, 0, 2, 1), (17, 255, 3, 20),
]
for price, mode, value, expected in cases:
    emu = Uc(UC_ARCH_ARM, UC_MODE_THUMB)
    emu.mem_map(0xa6f000, 0x2000)
    emu.mem_write(0xa6ff08, binary[0xa6ff08:0xa6ff84])
    emu.mem_map(0x20000000, 0x10000)
    emu.mem_map(0x30000000, 0x1000)
    emu.reg_write(UC_ARM_REG_R0, 0x20000100)
    emu.reg_write(UC_ARM_REG_R1, 1)
    emu.reg_write(UC_ARM_REG_R2, price)
    emu.reg_write(UC_ARM_REG_SP, 0x2000fff0)
    emu.reg_write(UC_ARM_REG_LR, 0x30000001)
    emu.reg_write(UC_ARM_REG_C1_C0_2, 0xf << 20)
    emu.reg_write(UC_ARM_REG_FPEXC, 1 << 30)
    def lookup(uc, address, size, unused):
        if address == 0xa6fb80:
            destination = uc.reg_read(UC_ARM_REG_R0)
            ptr = 0 if mode is None else 0x20000200
            if ptr: uc.mem_write(ptr, struct.pack("<IB", value, mode))
            uc.mem_write(destination, struct.pack("<II", ptr, 0))
            uc.reg_write(UC_ARM_REG_PC, uc.reg_read(UC_ARM_REG_LR))
    emu.hook_add(UC_HOOK_CODE, lookup)
    emu.emu_start(0xa6ff09, 0x30000000, count=150)
    assert emu.reg_read(UC_ARM_REG_R0) == expected, (price, mode, value, expected, emu.reg_read(UC_ARM_REG_R0))
print("Pinned original CalcBonusSaleValue executed:12 null/per-thousand/truncation/saturation/additive-wrap cases passed; benefit selection was stubbed, no Guild eligibility execution claim.")

#include "byte_decoder.h"

#include <stdio.h>

struct record {
    unsigned char tag;
    uint16_t value;
    unsigned char flags;
};

int main(void)
{
    const unsigned char wire[] = {0xA5, 0x34, 0x12, 0x7E};
    const size_t value_offset = 1;
    uint16_t value = 0;

    if (!read_u16_le(wire + value_offset, sizeof wire - value_offset, &value)
        || value != 0x1234u) {
        fputs("Unexpected result for the full input.\n", stderr);
        return 1;
    }

    struct record decoded = {wire[0], value, wire[3]};
    printf("wire size = %zu bytes\n", sizeof wire);
    printf("struct size = %zu bytes, alignment = %zu\n",
           sizeof decoded, _Alignof(struct record));
    printf("member offsets: tag=%zu, value=%zu, flags=%zu\n",
           offsetof(struct record, tag), offsetof(struct record, value),
           offsetof(struct record, flags));
    printf("tag=0x%02X value=0x%04X (%u) flags=0x%02X\n",
           (unsigned int)decoded.tag, (unsigned int)decoded.value,
           (unsigned int)decoded.value, (unsigned int)decoded.flags);

    uint16_t unchanged = 0xBEEFu;
    int ok = read_u16_le(wire + value_offset, 1, &unchanged);
    printf("short input: return=%d, out=0x%04X\n", ok, (unsigned int)unchanged);
    if (ok != 0 || unchanged != 0xBEEFu) {
        fputs("Unexpected result for the short input.\n", stderr);
        return 1;
    }

    return 0;
}

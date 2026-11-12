#include "byte_decoder.h"

#include <limits.h>

_Static_assert(CHAR_BIT == 8, "The sample format uses 8-bit bytes");

int read_u16_le(const unsigned char *bytes, size_t size, uint16_t *out)
{
    if (size < 2) {
        return 0;
    }

    unsigned int low = bytes[0];
    unsigned int high = bytes[1];
    *out = (uint16_t)(low | (high << 8));
    return 1;
}

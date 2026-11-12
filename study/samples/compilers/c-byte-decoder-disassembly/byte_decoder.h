#ifndef STUDY_BYTE_DECODER_H
#define STUDY_BYTE_DECODER_H

#include <stddef.h>
#include <stdint.h>

/* bytes points to at least size readable bytes when size is at least 2.
   out points to a writable uint16_t. A short input leaves *out unchanged. */
int read_u16_le(const unsigned char *bytes, size_t size, uint16_t *out);

#endif

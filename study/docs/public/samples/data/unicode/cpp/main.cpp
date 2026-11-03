#include <algorithm>
#include <array>
#include <climits>
#include <exception>
#include <iomanip>
#include <iostream>
#include <span>
#include <stdexcept>
#include <string_view>

static_assert(CHAR_BIT == 8, "This sample uses 8-bit bytes.");

namespace {
using Expected = std::span<const unsigned long>;

struct Fixture {
    const char* label;
    std::u8string_view utf8;
    std::u16string_view utf16;
    std::u32string_view scalars;
    Expected expectedUtf8;
    Expected expectedUtf16;
    Expected expectedScalars;
};

unsigned int checks = 0;

void check(bool condition, const char* message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
    ++checks;
}

template<class View>
bool equals(View actual, Expected expected) {
    return actual.size() == expected.size()
        && std::equal(actual.begin(), actual.end(), expected.begin(),
            [](auto unit, unsigned long value) {
                return static_cast<unsigned long>(unit) == value;
            });
}

template<class View>
void printHex(const char* label, View values, int width) {
    std::cout << "  " << label << ':' << std::hex << std::uppercase;
    for (auto value : values) {
        std::cout << ' ' << std::setw(width) << std::setfill('0')
                  << static_cast<unsigned long>(value);
    }
    std::cout << std::dec << std::setfill(' ') << '\n';
}

bool allScalars(std::u32string_view values) {
    return std::all_of(values.begin(), values.end(), [](char32_t value) {
        return value <= 0x10FFFFUL
            && !(value >= 0xD800UL && value <= 0xDFFFUL);
    });
}
} // namespace

int main() {
    try {
        constexpr std::array<unsigned long, 1> a8{0x41};
        constexpr std::array<unsigned long, 1> a16{0x0041};
        constexpr std::array<unsigned long, 1> a32{0x0041};
        constexpr std::array<unsigned long, 3> hiragana8{0xE3, 0x81, 0x82};
        constexpr std::array<unsigned long, 1> hiragana16{0x3042};
        constexpr std::array<unsigned long, 1> hiragana32{0x3042};
        constexpr std::array<unsigned long, 4> face8{0xF0, 0x9F, 0x98, 0x80};
        constexpr std::array<unsigned long, 2> face16{0xD83D, 0xDE00};
        constexpr std::array<unsigned long, 1> face32{0x1F600};
        constexpr std::array<unsigned long, 3> accent8{0x65, 0xCC, 0x81};
        constexpr std::array<unsigned long, 2> accent16{0x0065, 0x0301};
        constexpr std::array<unsigned long, 2> accent32{0x0065, 0x0301};

        const std::array fixtures{
            Fixture{"A", u8"A", u"A", U"A", a8, a16, a32},
            Fixture{"U+3042", u8"\u3042", u"\u3042", U"\u3042",
                    hiragana8, hiragana16, hiragana32},
            Fixture{"U+1F600", u8"\U0001F600", u"\U0001F600", U"\U0001F600",
                    face8, face16, face32},
            Fixture{"U+0065+U+0301", u8"e\u0301", u"e\u0301", U"e\u0301",
                    accent8, accent16, accent32}
        };

        std::cout << "C++20 known Unicode literals; CHAR_BIT=" << CHAR_BIT << '\n'
                  << "No runtime conversion, normalization, or grapheme segmentation.\n";
        for (const Fixture& fixture : fixtures) {
            check(equals(fixture.utf8, fixture.expectedUtf8), "UTF-8 mismatch");
            check(equals(fixture.utf16, fixture.expectedUtf16), "UTF-16 mismatch");
            check(equals(fixture.scalars, fixture.expectedScalars), "UTF-32 mismatch");
            check(allScalars(fixture.scalars), "Non-scalar UTF-32 literal");
            std::cout << fixture.label << " utf8_bytes=" << fixture.utf8.size()
                      << " utf16_units=" << fixture.utf16.size()
                      << " scalars=" << fixture.scalars.size() << '\n';
            printHex("UTF-8", fixture.utf8, 2);
            printHex("UTF-16 units", fixture.utf16, 4);
            printHex("scalars", fixture.scalars, 4);
        }
        std::cout << "PASS: " << checks << " checks\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "FAIL: " << error.what() << '\n';
        return 1;
    }
}

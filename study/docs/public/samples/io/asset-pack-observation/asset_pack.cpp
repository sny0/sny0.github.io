#include <algorithm>
#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

constexpr std::string_view magic = "SPAK";
constexpr std::uint32_t version = 1;
constexpr std::uint32_t header_size = 12;
constexpr std::uint32_t name_size = 16;
constexpr std::uint32_t entry_size = name_size + 8;
constexpr std::uint32_t max_entries = 32;
constexpr std::uint32_t max_file_size = 1024 * 1024;

struct Entry {
    std::string name;
    std::uint32_t offset;
    std::uint32_t length;
};

std::uint32_t read_u32_le(const char* bytes) {
    std::uint32_t result = 0;
    for (unsigned i = 0; i < 4; ++i) {
        const auto byte = static_cast<std::uint32_t>(static_cast<unsigned char>(bytes[i]));
        result |= byte << (8 * i);
    }
    return result;
}

void append_u32_le(std::vector<char>& out, std::uint32_t value) {
    for (unsigned i = 0; i < 4; ++i) {
        out.push_back(static_cast<char>((value >> (8 * i)) & 0xffu));
    }
}

void read_exact(std::istream& in, std::span<char> bytes) {
    if (!in.read(bytes.data(), static_cast<std::streamsize>(bytes.size()))) {
        throw std::runtime_error("short read or file I/O error");
    }
}

void write_new_file(const char* path, std::span<const char> bytes) {
    // The x mode makes creation fail if the name already exists.
#ifdef _MSC_VER
    std::FILE* file = nullptr;
    if (fopen_s(&file, path, "wbx") != 0) file = nullptr;
#else
    std::FILE* file = std::fopen(path, "wbx");
#endif
    if (!file) throw std::runtime_error(std::string("cannot create new file: ") + path);
    const auto written = std::fwrite(bytes.data(), 1, bytes.size(), file);
    const int closed = std::fclose(file);
    if (written != bytes.size() || closed != 0) {
        throw std::runtime_error(std::string("writing failed: ") + path);
    }
}

void make_pack(bool broken) {
    struct Asset {
        std::string_view name;
        std::string_view bytes;
    };
    constexpr std::array assets{Asset{"player", "ship"}, Asset{"stage", "level-1"},
                                Asset{"ui", "score"}};
    const char* path = broken ? "study-assets-bad.spack" : "study-assets.spack";
    std::vector<char> out(magic.begin(), magic.end());
    append_u32_le(out, version);
    append_u32_le(out, static_cast<std::uint32_t>(assets.size()));

    auto offset = header_size + entry_size * static_cast<std::uint32_t>(assets.size());
    for (const auto& asset : assets) {
        std::array<char, name_size> name{};
        std::copy(asset.name.begin(), asset.name.end(), name.begin());
        out.insert(out.end(), name.begin(), name.end());
        // For the broken fixture, offset + length would wrap to 2 in a u32.
        append_u32_le(out, broken && asset.name == "player" ? 0xfffffffeu : offset);
        const auto length = static_cast<std::uint32_t>(asset.bytes.size());
        append_u32_le(out, length);
        offset += length;
    }
    for (const auto& asset : assets) {
        out.insert(out.end(), asset.bytes.begin(), asset.bytes.end());
    }
    write_new_file(path, out);
    std::cout << "created " << path << '\n';
}

bool name_character(char c) {
    return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-';
}

std::vector<Entry> read_index(std::istream& in, std::uint32_t file_size) {
    std::array<char, header_size> header{};
    read_exact(in, header);
    if (std::string_view(header.data(), magic.size()) != magic) {
        throw std::runtime_error("bad magic");
    }
    if (read_u32_le(header.data() + 4) != version) {
        throw std::runtime_error("unsupported version");
    }
    const auto count = read_u32_le(header.data() + 8);
    if (count == 0 || count > max_entries || count > (file_size - header_size) / entry_size) {
        throw std::runtime_error("invalid entry count or truncated index");
    }

    std::vector<Entry> index;
    index.reserve(count);
    auto previous_end = header_size + count * entry_size;
    for (std::uint32_t i = 0; i < count; ++i) {
        std::array<char, entry_size> row{};
        read_exact(in, row);
        const auto name_limit = row.begin() + name_size;
        const auto name_end = std::find(row.begin(), name_limit, '\0');
        if (name_end == row.begin() || name_end == name_limit ||
            !std::all_of(row.begin(), name_end, name_character) ||
            !std::all_of(name_end, name_limit, [](char c) { return c == '\0'; })) {
            throw std::runtime_error("invalid or non-zero-padded asset name");
        }
        const std::string name(row.begin(), name_end);
        if (std::any_of(index.begin(), index.end(), [&](const Entry& e) { return e.name == name; })) {
            throw std::runtime_error("duplicate asset name: " + name);
        }

        const auto offset = read_u32_le(row.data() + name_size);
        const auto length = read_u32_le(row.data() + name_size + 4);
        // Check the starting point first so that file_size - offset cannot wrap.
        if (offset > file_size || length == 0 || length > file_size - offset) {
            throw std::runtime_error("asset range outside file: " + name);
        }
        if (offset < previous_end) {
            throw std::runtime_error("asset ranges overlap or are out of order: " + name);
        }
        previous_end = offset + length;  // The preceding checks make this sum safe.
        index.push_back({name, offset, length});
    }
    return index;
}

void print_entry(const Entry& entry) {
    std::cout << entry.name << " offset=" << entry.offset << " length=" << entry.length << '\n';
}

void inspect(const char* path, const char* requested_name) {
    std::ifstream in(path, std::ios::binary | std::ios::ate);
    if (!in) throw std::runtime_error("cannot open pack");
    const auto size = static_cast<std::streamoff>(in.tellg());
    if (size < header_size || size > max_file_size) {
        throw std::runtime_error("file size outside demo limits");
    }
    in.seekg(0);
    const auto index = read_index(in, static_cast<std::uint32_t>(size));

    if (!requested_name) {
        for (const auto& entry : index) print_entry(entry);
        return;
    }
    const auto selected = std::find_if(index.begin(), index.end(), [&](const Entry& entry) {
        return entry.name == requested_name;
    });
    if (selected == index.end()) throw std::runtime_error("asset not found");
    in.seekg(selected->offset);
    if (!in) throw std::runtime_error("cannot seek to asset");
    std::vector<char> bytes(selected->length);
    read_exact(in, bytes);
    print_entry(*selected);
    std::cout << "bytes:" << std::hex << std::setfill('0');
    constexpr std::size_t preview_size = 32;
    for (std::size_t i = 0; i < std::min(bytes.size(), preview_size); ++i) {
        std::cout << ' ' << std::setw(2) << static_cast<unsigned>(static_cast<unsigned char>(bytes[i]));
    }
    if (bytes.size() > preview_size) std::cout << " ...";
    std::cout << '\n';
}

int main(int argc, char** argv) {
    const std::string_view verb = argc >= 2 ? argv[1] : "";
    try {
        if (argc == 2 && (verb == "make" || verb == "make-bad")) {
            make_pack(verb == "make-bad");
        } else if (argc == 3 && verb == "list") {
            inspect(argv[2], nullptr);
        } else if (argc == 4 && verb == "read") {
            inspect(argv[2], argv[3]);
        } else {
            std::cerr << "Usage: asset_pack make | make-bad | list PACK | read PACK NAME\n";
            return 2;
        }
    } catch (const std::exception& error) {
        std::cerr << "error: " << error.what() << '\n';
        return 1;
    }
    return 0;
}

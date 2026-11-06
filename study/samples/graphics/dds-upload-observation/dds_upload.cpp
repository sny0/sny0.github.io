#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <d3d12.h>
#include <dxgi1_4.h>
#include <wrl/client.h>

#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <limits>
#include <stdexcept>
#include <string_view>

using Microsoft::WRL::ComPtr;

constexpr char dds_path[] = "study-two-mips.dds";
constexpr UINT mip_count = 2;
constexpr std::size_t header_bytes = 148;
constexpr std::array<std::size_t, mip_count> mip_offset{header_bytes, header_bytes + 4 * 4 * 4};
using DdsBytes = std::array<std::uint8_t, mip_offset[1] + 2 * 2 * 4>;

void check(HRESULT result, const char* operation) {
    if (FAILED(result)) {
        char message[128]{};
        std::snprintf(message, sizeof(message), "%s failed (HRESULT 0x%08lX)",
                      operation, static_cast<unsigned long>(result));
        throw std::runtime_error(message);
    }
}

void put_u32(DdsBytes& data, std::size_t offset, std::uint32_t value) {
    for (unsigned i = 0; i < 4; ++i) {
        data[offset + i] = static_cast<std::uint8_t>(value >> (8 * i));
    }
}

std::uint32_t get_u32(const DdsBytes& data, std::size_t offset) {
    std::uint32_t value = 0;
    for (unsigned i = 0; i < 4; ++i) {
        value |= static_cast<std::uint32_t>(data[offset + i]) << (8 * i);
    }
    return value;
}

void make_fixture() {
    DdsBytes data{};
    put_u32(data, 0, 0x20534444);   // "DDS "
    put_u32(data, 4, 124);          // DDS_HEADER size
    put_u32(data, 8, 0x0002100f);   // CAPS, HEIGHT, WIDTH, PITCH, PIXELFORMAT, MIPMAPCOUNT
    put_u32(data, 12, 4);           // Height
    put_u32(data, 16, 4);           // Width
    put_u32(data, 20, 16);          // Top mip row pitch (four RGBA pixels)
    put_u32(data, 28, mip_count);
    put_u32(data, 76, 32);          // DDS_PIXELFORMAT size
    put_u32(data, 80, 4);           // DDPF_FOURCC
    put_u32(data, 84, 0x30315844);  // "DX10"
    put_u32(data, 108, 0x00401008); // TEXTURE, COMPLEX, MIPMAP
    put_u32(data, 128, DXGI_FORMAT_R8G8B8A8_UNORM);
    put_u32(data, 132, 3);          // DDS_DIMENSION_TEXTURE2D
    put_u32(data, 140, 1);          // Array size
    put_u32(data, 144, 3);          // DDS_ALPHA_MODE_OPAQUE

    for (UINT mip = 0; mip < mip_count; ++mip) {
        const UINT side = 4u >> mip;
        auto pixel = mip_offset[mip];
        for (UINT y = 0; y < side; ++y) {
            for (UINT x = 0; x < side; ++x) {
                data[pixel++] = static_cast<std::uint8_t>(0x20u + 0x60u * mip);
                data[pixel++] = static_cast<std::uint8_t>(0x10u + 0x30u * y);
                data[pixel++] = static_cast<std::uint8_t>(0x08u + 0x30u * x);
                data[pixel++] = 0xff;
            }
        }
    }

    std::FILE* file = nullptr;
    if (fopen_s(&file, dds_path, "wbx") != 0) {
        throw std::runtime_error("cannot create study-two-mips.dds (use an empty folder)");
    }
    const auto written = std::fwrite(data.data(), 1, data.size(), file);
    const int closed = std::fclose(file);
    if (written != data.size() || closed != 0) throw std::runtime_error("DDS write failed");
    std::printf("created %s (%zu bytes)\n", dds_path, data.size());
}

DdsBytes load_fixture() {
    DdsBytes data{};
    std::ifstream file(dds_path, std::ios::binary | std::ios::ate);
    if (!file || file.tellg() != static_cast<std::streamoff>(data.size())) {
        throw std::runtime_error("expected the 228-byte DDS fixture (run make first)");
    }
    file.seekg(0);
    if (!file.read(reinterpret_cast<char*>(data.data()), static_cast<std::streamsize>(data.size()))) {
        throw std::runtime_error("DDS read failed");
    }
    // Accept the shape and format used by the fixture, then derive the copy layout.
    if (get_u32(data, 0) != 0x20534444 || get_u32(data, 4) != 124 ||
        get_u32(data, 12) != 4 || get_u32(data, 16) != 4 || get_u32(data, 20) != 16 ||
        get_u32(data, 28) != mip_count || get_u32(data, 76) != 32 ||
        (get_u32(data, 80) & 4) == 0 || get_u32(data, 84) != 0x30315844 ||
        get_u32(data, 128) != DXGI_FORMAT_R8G8B8A8_UNORM || get_u32(data, 132) != 3 ||
        get_u32(data, 136) != 0 || get_u32(data, 140) != 1) {
        throw std::runtime_error("unexpected DDS header (expected DX10 RGBA8 4x4, two mips)");
    }
    return data;
}

ComPtr<ID3D12Resource> make_resource(ID3D12Device* device, D3D12_HEAP_TYPE type,
                                     const D3D12_RESOURCE_DESC& desc, D3D12_RESOURCE_STATES state) {
    D3D12_HEAP_PROPERTIES heap{};
    heap.Type = type;
    heap.CreationNodeMask = 1;
    heap.VisibleNodeMask = 1;
    ComPtr<ID3D12Resource> resource;
    check(device->CreateCommittedResource(&heap, D3D12_HEAP_FLAG_NONE, &desc, state,
                                           nullptr, IID_PPV_ARGS(&resource)),
          "CreateCommittedResource");
    return resource;
}

void transition(ID3D12GraphicsCommandList* commands, ID3D12Resource* texture,
                D3D12_RESOURCE_STATES from, D3D12_RESOURCE_STATES to) {
    D3D12_RESOURCE_BARRIER barrier{};
    barrier.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
    barrier.Transition = {texture, D3D12_RESOURCE_BARRIER_ALL_SUBRESOURCES, from, to};
    commands->ResourceBarrier(1, &barrier);
}

void verify_texture(const DdsBytes& data) {
    ComPtr<IDXGIFactory4> factory;
    check(CreateDXGIFactory1(IID_PPV_ARGS(&factory)), "CreateDXGIFactory1");
    ComPtr<IDXGIAdapter> adapter;
    check(factory->EnumWarpAdapter(IID_PPV_ARGS(&adapter)), "EnumWarpAdapter");
    ComPtr<ID3D12Device> device;
    check(D3D12CreateDevice(adapter.Get(), D3D_FEATURE_LEVEL_11_0, IID_PPV_ARGS(&device)),
          "D3D12CreateDevice (WARP)");

    D3D12_RESOURCE_DESC texture_desc{};
    texture_desc.Dimension = D3D12_RESOURCE_DIMENSION_TEXTURE2D;
    texture_desc.Width = 4;
    texture_desc.Height = 4;
    texture_desc.DepthOrArraySize = 1;
    texture_desc.MipLevels = mip_count;
    texture_desc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    texture_desc.SampleDesc.Count = 1;
    texture_desc.Layout = D3D12_TEXTURE_LAYOUT_UNKNOWN;

    std::array<D3D12_PLACED_SUBRESOURCE_FOOTPRINT, mip_count> layout{};
    std::array<UINT, mip_count> rows{};
    std::array<UINT64, mip_count> row_bytes{};
    UINT64 total = 0;
    device->GetCopyableFootprints(&texture_desc, 0, mip_count, 0, layout.data(), rows.data(),
                                  row_bytes.data(), &total);
    if (total == 0 || total > (std::numeric_limits<std::size_t>::max)()) {
        throw std::runtime_error("invalid copy footprint size");
    }
    for (UINT mip = 0; mip < mip_count; ++mip) {
        const UINT side = 4u >> mip;
        if (rows[mip] != side || row_bytes[mip] != 4u * side) {
            throw std::runtime_error("unexpected row count or size");
        }
        std::printf("mip %u: DDS offset=%zu row bytes=%llu; buffer offset=%llu RowPitch=%u\n",
                    mip, mip_offset[mip], row_bytes[mip], layout[mip].Offset,
                    layout[mip].Footprint.RowPitch);
    }

    D3D12_RESOURCE_DESC buffer_desc{};
    buffer_desc.Dimension = D3D12_RESOURCE_DIMENSION_BUFFER;
    buffer_desc.Width = total;
    buffer_desc.Height = 1;
    buffer_desc.DepthOrArraySize = 1;
    buffer_desc.MipLevels = 1;
    buffer_desc.SampleDesc.Count = 1;
    buffer_desc.Layout = D3D12_TEXTURE_LAYOUT_ROW_MAJOR;
    auto texture = make_resource(device.Get(), D3D12_HEAP_TYPE_DEFAULT, texture_desc,
                                 D3D12_RESOURCE_STATE_COPY_DEST);
    auto upload = make_resource(device.Get(), D3D12_HEAP_TYPE_UPLOAD, buffer_desc,
                                D3D12_RESOURCE_STATE_GENERIC_READ);
    auto readback = make_resource(device.Get(), D3D12_HEAP_TYPE_READBACK, buffer_desc,
                                  D3D12_RESOURCE_STATE_COPY_DEST);

    const D3D12_RANGE empty{0, 0};
    const D3D12_RANGE buffer_range{0, static_cast<std::size_t>(total)};
    void* mapped = nullptr;
    check(upload->Map(0, &empty, &mapped), "Map upload");
    auto* destination = static_cast<std::uint8_t*>(mapped);
    for (UINT mip = 0; mip < mip_count; ++mip) {
        for (UINT row = 0; row < rows[mip]; ++row) {
            std::memcpy(destination + layout[mip].Offset + row * layout[mip].Footprint.RowPitch,
                        data.data() + mip_offset[mip] + row * row_bytes[mip],
                        static_cast<std::size_t>(row_bytes[mip]));
        }
    }
    upload->Unmap(0, &buffer_range);

    D3D12_COMMAND_QUEUE_DESC queue_desc{};
    queue_desc.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
    ComPtr<ID3D12CommandQueue> queue;
    ComPtr<ID3D12CommandAllocator> allocator;
    ComPtr<ID3D12GraphicsCommandList> commands;
    ComPtr<ID3D12Fence> fence;
    check(device->CreateCommandQueue(&queue_desc, IID_PPV_ARGS(&queue)), "CreateCommandQueue");
    check(device->CreateCommandAllocator(queue_desc.Type, IID_PPV_ARGS(&allocator)),
          "CreateCommandAllocator");
    check(device->CreateCommandList(0, queue_desc.Type, allocator.Get(), nullptr,
                                     IID_PPV_ARGS(&commands)), "CreateCommandList");
    check(device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&fence)), "CreateFence");

    for (UINT mip = 0; mip < mip_count; ++mip) {
        D3D12_TEXTURE_COPY_LOCATION src{};
        src.pResource = upload.Get();
        src.Type = D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;
        src.PlacedFootprint = layout[mip];
        D3D12_TEXTURE_COPY_LOCATION dst{};
        dst.pResource = texture.Get();
        dst.Type = D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;
        dst.SubresourceIndex = mip;
        commands->CopyTextureRegion(&dst, 0, 0, 0, &src, nullptr);
    }

    // The extra copy verifies the upload without a window or a shader.
    transition(commands.Get(), texture.Get(), D3D12_RESOURCE_STATE_COPY_DEST,
               D3D12_RESOURCE_STATE_COPY_SOURCE);
    for (UINT mip = 0; mip < mip_count; ++mip) {
        D3D12_TEXTURE_COPY_LOCATION src{};
        src.pResource = texture.Get();
        src.Type = D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;
        src.SubresourceIndex = mip;
        D3D12_TEXTURE_COPY_LOCATION dst{};
        dst.pResource = readback.Get();
        dst.Type = D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;
        dst.PlacedFootprint = layout[mip];
        commands->CopyTextureRegion(&dst, 0, 0, 0, &src, nullptr);
    }
    transition(commands.Get(), texture.Get(), D3D12_RESOURCE_STATE_COPY_SOURCE,
               D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE);

    check(commands->Close(), "Close command list");
    ID3D12CommandList* batch[]{commands.Get()};
    queue->ExecuteCommandLists(1, batch);
    check(queue->Signal(fence.Get(), 1), "Signal fence");
    check(fence->SetEventOnCompletion(1, nullptr), "Wait for fence");
    check(device->GetDeviceRemovedReason(), "D3D12 device status");

    check(readback->Map(0, &buffer_range, &mapped), "Map readback");
    const auto* returned = static_cast<const std::uint8_t*>(mapped);
    std::array<bool, mip_count> matches{};
    matches.fill(true);
    for (UINT mip = 0; mip < mip_count; ++mip) {
        for (UINT row = 0; row < rows[mip]; ++row) {
            const auto* expected = data.data() + mip_offset[mip] + row * row_bytes[mip];
            const auto* actual = returned + layout[mip].Offset + row * layout[mip].Footprint.RowPitch;
            if (std::memcmp(expected, actual, static_cast<std::size_t>(row_bytes[mip])) != 0) {
                matches[mip] = false;
            }
        }
    }
    readback->Unmap(0, &empty);
    for (UINT mip = 0; mip < mip_count; ++mip) {
        if (!matches[mip]) throw std::runtime_error("readback mismatch");
        std::printf("mip %u: %llu bytes match after D3D12 readback\n", mip,
                    rows[mip] * row_bytes[mip]);
    }
}

int main(int argc, char** argv) {
    if (argc != 2) {
        std::fputs("Usage: dds_upload make | verify\n", stderr);
        return 2;
    }
    const std::string_view command = argv[1];
    try {
        if (command == "make") make_fixture();
        else if (command == "verify") verify_texture(load_fixture());
        else throw std::runtime_error("expected make or verify");
    } catch (const std::exception& error) {
        std::fprintf(stderr, "error: %s\n", error.what());
        return 1;
    }
    return 0;
}

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <d3d12.h>
#include <d3dcompiler.h>
#include <dxgi1_4.h>
#include <wrl/client.h>

#include <array>
#include <bit>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

using Microsoft::WRL::ComPtr;

constexpr char path[] = "study-triangle.glb";
constexpr std::uint32_t glb_magic = 0x46546c67;  // glTF
constexpr std::uint32_t json_type = 0x4e4f534a;  // JSON
constexpr std::uint32_t bin_type = 0x004e4942;   // BIN\0
constexpr UINT stride = 24;
constexpr UINT vertex_count = 3;
constexpr UINT index_count = 3;
constexpr UINT vertex_bytes = stride * vertex_count;
constexpr UINT index_bytes = 2 * index_count;
constexpr UINT data_bytes = vertex_bytes + index_bytes;
constexpr UINT bin_bytes = 80;  // 78 useful bytes + two padding bytes

constexpr char json[] = R"json({
  "asset": {"version": "2.0"},
  "scene": 0,
  "scenes": [{"nodes": [0]}],
  "nodes": [{"mesh": 0}],
  "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "mode": 4}]}],
  "buffers": [{"byteLength": 78}],
  "bufferViews": [
    {"buffer": 0, "byteOffset": 0, "byteLength": 72, "byteStride": 24, "target": 34962},
    {"buffer": 0, "byteOffset": 72, "byteLength": 6, "target": 34963}
  ],
  "accessors": [
    {"bufferView": 0, "byteOffset": 0, "componentType": 5126, "count": 3, "type": "VEC3",
     "min": [-0.75, -0.75, 0.5], "max": [0.75, 0.75, 0.5]},
    {"bufferView": 0, "byteOffset": 12, "componentType": 5126, "count": 3, "type": "VEC3"},
    {"bufferView": 1, "componentType": 5123, "count": 3, "type": "SCALAR"}
  ]
})json";

struct Vertex {
    std::array<float, 3> position;
    std::array<float, 3> normal;
};
static_assert(sizeof(Vertex) == stride && offsetof(Vertex, normal) == 12);

struct Mesh {
    std::array<Vertex, vertex_count> vertices{};
    std::array<std::uint16_t, index_count> indices{};
};

std::string padded_json() {
    std::string text = json;
    while (text.size() % 4 != 0) text.push_back(' ');
    return text;
}

void append_u32(std::vector<std::uint8_t>& bytes, std::uint32_t value) {
    for (unsigned i = 0; i < 4; ++i) {
        bytes.push_back(static_cast<std::uint8_t>(value >> (i * 8)));
    }
}

std::uint32_t u32(const std::uint8_t* bytes) {
    std::uint32_t value = 0;
    for (unsigned i = 0; i < 4; ++i) value |= std::uint32_t{bytes[i]} << (i * 8);
    return value;
}

void make_glb() {
    constexpr Mesh mesh{{Vertex{{-0.75f, -0.75f, 0.5f}, {0, 0, 1}},
                         Vertex{{0.75f, -0.75f, 0.5f}, {0, 0, 1}},
                         Vertex{{0.0f, 0.75f, 0.5f}, {0, 0, 1}}}, {2, 0, 1}};
    const auto text = padded_json();
    std::vector<std::uint8_t> bytes;
    append_u32(bytes, glb_magic);
    append_u32(bytes, 2);
    append_u32(bytes, static_cast<std::uint32_t>(12 + 8 + text.size() + 8 + bin_bytes));
    append_u32(bytes, static_cast<std::uint32_t>(text.size()));
    append_u32(bytes, json_type);
    bytes.insert(bytes.end(), text.begin(), text.end());
    append_u32(bytes, bin_bytes);
    append_u32(bytes, bin_type);
    for (const auto& vertex : mesh.vertices) {
        for (float x : vertex.position) append_u32(bytes, std::bit_cast<std::uint32_t>(x));
        for (float x : vertex.normal) append_u32(bytes, std::bit_cast<std::uint32_t>(x));
    }
    for (auto i : mesh.indices) {
        bytes.push_back(static_cast<std::uint8_t>(i));
        bytes.push_back(static_cast<std::uint8_t>(i >> 8));
    }
    bytes.insert(bytes.end(), bin_bytes - data_bytes, 0);
    std::FILE* file = nullptr;
    if (fopen_s(&file, path, "wbx") != 0) throw std::runtime_error("cannot create study-triangle.glb");
    const auto written = std::fwrite(bytes.data(), 1, bytes.size(), file);
    const int closed = std::fclose(file);
    if (written != bytes.size() || closed != 0) throw std::runtime_error("GLB write failed");
    std::printf("created %s (%zu bytes)\n", path, bytes.size());
}

Mesh load_glb() {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file) throw std::runtime_error("cannot open study-triangle.glb (run make first)");
    const auto size = static_cast<std::streamoff>(file.tellg());
    if (size < 28 || size > 65536) throw std::runtime_error("GLB size outside demo limits");
    std::vector<std::uint8_t> bytes(static_cast<std::size_t>(size));
    file.seekg(0);
    if (!file.read(reinterpret_cast<char*>(bytes.data()), size)) throw std::runtime_error("GLB read failed");
    if (u32(bytes.data()) != glb_magic || u32(bytes.data() + 4) != 2 ||
        u32(bytes.data() + 8) != bytes.size()) throw std::runtime_error("invalid GLB header");

    const auto json_length = u32(bytes.data() + 12);
    if (u32(bytes.data() + 16) != json_type || json_length % 4 != 0 ||
        json_length > bytes.size() - 28) throw std::runtime_error("invalid JSON chunk range");
    // This demo accepts its own declared layout instead of parsing arbitrary glTF JSON.
    const std::string_view actual(reinterpret_cast<const char*>(bytes.data() + 20), json_length);
    if (actual != padded_json()) throw std::runtime_error("unexpected JSON layout (use the generated fixture)");

    const std::size_t bin_header = 20 + json_length;
    if (u32(bytes.data() + bin_header) != bin_bytes || u32(bytes.data() + bin_header + 4) != bin_type ||
        bytes.size() - bin_header - 8 != bin_bytes) throw std::runtime_error("invalid BIN chunk range");
    const auto* bin = bytes.data() + bin_header + 8;
    Mesh mesh;
    for (UINT i = 0; i < vertex_count; ++i) {
        const auto* row = bin + i * stride;
        for (UINT c = 0; c < 3; ++c) {
            const float p = std::bit_cast<float>(u32(row + c * 4));
            const float n = std::bit_cast<float>(u32(row + 12 + c * 4));
            if (!std::isfinite(p) || !std::isfinite(n)) throw std::runtime_error("non-finite vertex data");
            mesh.vertices[i].position[c] = p;
            mesh.vertices[i].normal[c] = n;
        }
    }
    for (UINT i = 0; i < index_count; ++i) {
        const auto* value = bin + vertex_bytes + i * 2;
        const auto index = static_cast<std::uint16_t>(value[0] | (std::uint16_t{value[1]} << 8));
        if (index >= mesh.vertices.size()) throw std::runtime_error("index outside vertex range");
        mesh.indices[i] = index;
    }
    return mesh;
}

void check(HRESULT result, const char* operation) {
    if (FAILED(result)) {
        char message[128]{};
        std::snprintf(message, sizeof(message), "%s failed (HRESULT 0x%08lX)", operation,
                      static_cast<unsigned long>(result));
        throw std::runtime_error(message);
    }
}

ComPtr<ID3D12Resource> resource(ID3D12Device* device, D3D12_HEAP_TYPE type,
                                const D3D12_RESOURCE_DESC& desc, D3D12_RESOURCE_STATES state) {
    D3D12_HEAP_PROPERTIES heap{};
    heap.Type = type;
    heap.CreationNodeMask = heap.VisibleNodeMask = 1;
    ComPtr<ID3D12Resource> result;
    check(device->CreateCommittedResource(&heap, D3D12_HEAP_FLAG_NONE, &desc, state,
                                           nullptr, IID_PPV_ARGS(&result)), "CreateCommittedResource");
    return result;
}

D3D12_RESOURCE_DESC buffer_desc(UINT64 size) {
    D3D12_RESOURCE_DESC desc{};
    desc.Dimension = D3D12_RESOURCE_DIMENSION_BUFFER;
    desc.Width = size;
    desc.Height = 1;
    desc.DepthOrArraySize = 1;
    desc.MipLevels = 1;
    desc.SampleDesc.Count = 1;
    desc.Layout = D3D12_TEXTURE_LAYOUT_ROW_MAJOR;
    return desc;
}

constexpr char shader[] = R"hlsl(
struct VertexOut {
    float4 position : SV_Position;
    float3 normal : NORMAL;
};
VertexOut vs(float3 position : POSITION, float3 normal : NORMAL) {
    VertexOut output;
    output.position = float4(position, 1.0);
    output.normal = normal;
    return output;
}
float4 ps(VertexOut input) : SV_Target {
    return float4(saturate(input.normal.z), 0.0, 0.0, 1.0);
}
)hlsl";

ComPtr<ID3DBlob> compile_shader(const char* entry, const char* target) {
    ComPtr<ID3DBlob> code;
    ComPtr<ID3DBlob> errors;
    const auto result = D3DCompile(shader, sizeof(shader) - 1, nullptr, nullptr, nullptr, entry,
                                   target, D3DCOMPILE_ENABLE_STRICTNESS, 0, &code, &errors);
    if (FAILED(result) && errors) {
        std::fwrite(errors->GetBufferPointer(), 1, errors->GetBufferSize(), stderr);
    }
    check(result, "D3DCompile");
    return code;
}

ComPtr<ID3D12PipelineState> pipeline(ID3D12Device* device, ID3D12RootSignature* root,
                                     DXGI_FORMAT format) {
    const auto vs = compile_shader("vs", "vs_5_0");
    const auto ps = compile_shader("ps", "ps_5_0");
    const D3D12_INPUT_ELEMENT_DESC elements[]{
        {"POSITION", 0, DXGI_FORMAT_R32G32B32_FLOAT, 0, 0, D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA, 0},
        {"NORMAL", 0, DXGI_FORMAT_R32G32B32_FLOAT, 0, 12, D3D12_INPUT_CLASSIFICATION_PER_VERTEX_DATA, 0}
    };
    D3D12_GRAPHICS_PIPELINE_STATE_DESC desc{};
    desc.pRootSignature = root;
    desc.VS = {vs->GetBufferPointer(), vs->GetBufferSize()};
    desc.PS = {ps->GetBufferPointer(), ps->GetBufferSize()};
    desc.InputLayout = {elements, 2};
    desc.RasterizerState.FillMode = D3D12_FILL_MODE_SOLID;
    desc.RasterizerState.CullMode = D3D12_CULL_MODE_NONE;
    desc.RasterizerState.DepthClipEnable = TRUE;
    desc.DepthStencilState.DepthFunc = D3D12_COMPARISON_FUNC_ALWAYS;
    desc.DepthStencilState.FrontFace = {D3D12_STENCIL_OP_KEEP, D3D12_STENCIL_OP_KEEP,
                                        D3D12_STENCIL_OP_KEEP, D3D12_COMPARISON_FUNC_ALWAYS};
    desc.DepthStencilState.BackFace = desc.DepthStencilState.FrontFace;
    desc.BlendState.RenderTarget[0] = {FALSE, FALSE, D3D12_BLEND_ONE, D3D12_BLEND_ZERO,
        D3D12_BLEND_OP_ADD, D3D12_BLEND_ONE, D3D12_BLEND_ZERO, D3D12_BLEND_OP_ADD,
        D3D12_LOGIC_OP_NOOP, D3D12_COLOR_WRITE_ENABLE_ALL};
    desc.SampleMask = UINT_MAX;
    desc.SampleDesc.Count = 1;
    desc.PrimitiveTopologyType = D3D12_PRIMITIVE_TOPOLOGY_TYPE_TRIANGLE;
    desc.NumRenderTargets = 1;
    desc.RTVFormats[0] = format;
    ComPtr<ID3D12PipelineState> result;
    check(device->CreateGraphicsPipelineState(&desc, IID_PPV_ARGS(&result)), "CreateGraphicsPipelineState");
    return result;
}

void draw_and_verify(const Mesh& mesh) {
    ComPtr<IDXGIFactory4> factory;
    check(CreateDXGIFactory1(IID_PPV_ARGS(&factory)), "CreateDXGIFactory1");
    ComPtr<IDXGIAdapter> adapter;
    check(factory->EnumWarpAdapter(IID_PPV_ARGS(&adapter)), "EnumWarpAdapter");
    ComPtr<ID3D12Device> device;
    check(D3D12CreateDevice(adapter.Get(), D3D_FEATURE_LEVEL_11_0, IID_PPV_ARGS(&device)),
          "D3D12CreateDevice (WARP)");

    D3D12_ROOT_SIGNATURE_DESC root_desc{};
    root_desc.Flags = D3D12_ROOT_SIGNATURE_FLAG_ALLOW_INPUT_ASSEMBLER_INPUT_LAYOUT;
    ComPtr<ID3DBlob> root_data;
    check(D3D12SerializeRootSignature(&root_desc, D3D_ROOT_SIGNATURE_VERSION_1, &root_data, nullptr),
          "D3D12SerializeRootSignature");
    ComPtr<ID3D12RootSignature> root;
    check(device->CreateRootSignature(0, root_data->GetBufferPointer(), root_data->GetBufferSize(),
                                      IID_PPV_ARGS(&root)), "CreateRootSignature");

    constexpr UINT side = 32;
    D3D12_RESOURCE_DESC target_desc{};
    target_desc.Dimension = D3D12_RESOURCE_DIMENSION_TEXTURE2D;
    target_desc.Width = side;
    target_desc.Height = side;
    target_desc.DepthOrArraySize = 1;
    target_desc.MipLevels = 1;
    target_desc.SampleDesc.Count = 1;
    target_desc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    target_desc.Flags = D3D12_RESOURCE_FLAG_ALLOW_RENDER_TARGET;
    const auto state = pipeline(device.Get(), root.Get(), target_desc.Format);
    auto target = resource(device.Get(), D3D12_HEAP_TYPE_DEFAULT, target_desc, D3D12_RESOURCE_STATE_RENDER_TARGET);
    auto geometry = resource(device.Get(), D3D12_HEAP_TYPE_UPLOAD, buffer_desc(data_bytes),
                             D3D12_RESOURCE_STATE_GENERIC_READ);
    const D3D12_RANGE empty{0, 0};
    const D3D12_RANGE geometry_range{0, data_bytes};
    void* mapped = nullptr;
    check(geometry->Map(0, &empty, &mapped), "Map geometry");
    std::memcpy(mapped, mesh.vertices.data(), vertex_bytes);
    std::memcpy(static_cast<std::uint8_t*>(mapped) + vertex_bytes, mesh.indices.data(), index_bytes);
    geometry->Unmap(0, &geometry_range);

    D3D12_PLACED_SUBRESOURCE_FOOTPRINT layout{};
    UINT64 total = 0;
    device->GetCopyableFootprints(&target_desc, 0, 1, 0, &layout, nullptr, nullptr, &total);
    auto readback = resource(device.Get(), D3D12_HEAP_TYPE_READBACK, buffer_desc(total),
                             D3D12_RESOURCE_STATE_COPY_DEST);
    D3D12_DESCRIPTOR_HEAP_DESC rtv_desc{};
    rtv_desc.Type = D3D12_DESCRIPTOR_HEAP_TYPE_RTV;
    rtv_desc.NumDescriptors = 1;
    ComPtr<ID3D12DescriptorHeap> rtv_heap;
    check(device->CreateDescriptorHeap(&rtv_desc, IID_PPV_ARGS(&rtv_heap)), "CreateDescriptorHeap");
    const auto rtv = rtv_heap->GetCPUDescriptorHandleForHeapStart();
    device->CreateRenderTargetView(target.Get(), nullptr, rtv);

    D3D12_COMMAND_QUEUE_DESC queue_desc{};
    queue_desc.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
    ComPtr<ID3D12CommandQueue> queue;
    ComPtr<ID3D12CommandAllocator> allocator;
    ComPtr<ID3D12GraphicsCommandList> commands;
    ComPtr<ID3D12Fence> fence;
    check(device->CreateCommandQueue(&queue_desc, IID_PPV_ARGS(&queue)), "CreateCommandQueue");
    check(device->CreateCommandAllocator(queue_desc.Type, IID_PPV_ARGS(&allocator)), "CreateCommandAllocator");
    check(device->CreateCommandList(0, queue_desc.Type, allocator.Get(), state.Get(), IID_PPV_ARGS(&commands)),
          "CreateCommandList");
    check(device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&fence)), "CreateFence");

    const auto address = geometry->GetGPUVirtualAddress();
    const D3D12_VERTEX_BUFFER_VIEW vb{address, vertex_bytes, stride};
    const D3D12_INDEX_BUFFER_VIEW ib{address + vertex_bytes, index_bytes, DXGI_FORMAT_R16_UINT};
    const D3D12_VIEWPORT viewport{0, 0, static_cast<float>(side), static_cast<float>(side), 0, 1};
    const D3D12_RECT scissor{0, 0, side, side};
    constexpr float blue[]{0, 0, 1, 1};
    commands->ClearRenderTargetView(rtv, blue, 0, nullptr);
    commands->OMSetRenderTargets(1, &rtv, FALSE, nullptr);
    commands->SetGraphicsRootSignature(root.Get());
    commands->RSSetViewports(1, &viewport);
    commands->RSSetScissorRects(1, &scissor);
    commands->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
    commands->IASetVertexBuffers(0, 1, &vb);
    commands->IASetIndexBuffer(&ib);
    commands->DrawIndexedInstanced(index_count, 1, 0, 0, 0);

    D3D12_RESOURCE_BARRIER barrier{};
    barrier.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
    barrier.Transition = {target.Get(), 0, D3D12_RESOURCE_STATE_RENDER_TARGET, D3D12_RESOURCE_STATE_COPY_SOURCE};
    commands->ResourceBarrier(1, &barrier);
    D3D12_TEXTURE_COPY_LOCATION src{};
    src.pResource = target.Get();
    src.Type = D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;
    D3D12_TEXTURE_COPY_LOCATION dst{};
    dst.pResource = readback.Get();
    dst.Type = D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;
    dst.PlacedFootprint = layout;
    commands->CopyTextureRegion(&dst, 0, 0, 0, &src, nullptr);

    check(commands->Close(), "Close command list");
    ID3D12CommandList* batch[]{commands.Get()};
    queue->ExecuteCommandLists(1, batch);
    check(queue->Signal(fence.Get(), 1), "Signal fence");
    check(fence->SetEventOnCompletion(1, nullptr), "Wait for fence");
    check(device->GetDeviceRemovedReason(), "D3D12 device status");

    const D3D12_RANGE pixel_range{0, static_cast<SIZE_T>(total)};
    check(readback->Map(0, &pixel_range, &mapped), "Map readback");
    const auto* pixels = static_cast<const std::uint8_t*>(mapped) + layout.Offset;
    const auto* center = pixels + (side / 2) * layout.Footprint.RowPitch + (side / 2) * 4;
    constexpr std::array<std::uint8_t, 4> red_pixel{255, 0, 0, 255};
    constexpr std::array<std::uint8_t, 4> blue_pixel{0, 0, 255, 255};
    const bool ok = std::memcmp(center, red_pixel.data(), 4) == 0 &&
                    std::memcmp(pixels, blue_pixel.data(), 4) == 0;
    readback->Unmap(0, &empty);
    if (!ok) throw std::runtime_error("unexpected center or corner pixel");
    std::puts("WARP readback: center=(255,0,0,255), corner=(0,0,255,255)");
}

int main(int argc, char** argv) {
    const std::string_view command = argc == 2 ? argv[1] : "";
    try {
        if (command == "make") make_glb();
        else if (command == "verify") {
            const auto mesh = load_glb();
            for (auto index : mesh.indices) {
                const auto& vertex = mesh.vertices[index];
                std::printf("index %u -> POSITION=(%.2f,%.2f,%.2f), NORMAL.z=%.2f\n",
                            static_cast<unsigned>(index), vertex.position[0], vertex.position[1],
                            vertex.position[2], vertex.normal[2]);
            }
            draw_and_verify(mesh);
        } else {
            std::fputs("Usage: glb_mesh make | verify\n", stderr);
            return 2;
        }
    } catch (const std::exception& error) {
        std::fprintf(stderr, "error: %s\n", error.what());
        return 1;
    }
    return 0;
}

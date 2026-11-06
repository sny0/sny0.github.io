#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <d3d12.h>
#include <d3dcompiler.h>
#include <dxgi1_4.h>
#include <wrl/client.h>

#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <stdexcept>

using Microsoft::WRL::ComPtr;

constexpr UINT side = 32;
constexpr auto format = DXGI_FORMAT_R8G8B8A8_UNORM;
using Pixel = std::array<std::uint8_t, 4>;
constexpr Pixel red{255, 0, 0, 255};
constexpr Pixel green{0, 255, 0, 255};
constexpr Pixel blue{0, 0, 255, 255};

constexpr char shader[] = R"hlsl(
float4 fullscreen(uint id : SV_VertexID) : SV_Position {
    const float2 positions[3] = {float2(-1, -1), float2(-1, 3), float2(3, -1)};
    return float4(positions[id], 0, 1);
}

float4 scene_pass(float4 pixel : SV_Position) : SV_Target {
    return pixel.x < 16.0 ? float4(1, 0, 0, 1) : float4(0, 1, 0, 1);
}

Texture2D<float4> scene_color : register(t0);
float4 post_pass(float4 pixel : SV_Position) : SV_Target {
    const float4 rgba = scene_color.Load(int3(int2(pixel.xy), 0));
    return rgba.bgra;
}
)hlsl";

void check(HRESULT result, const char* operation) {
    if (FAILED(result)) {
        char message[128]{};
        std::snprintf(message, sizeof(message), "%s failed (HRESULT 0x%08lX)", operation,
                      static_cast<unsigned long>(result));
        throw std::runtime_error(message);
    }
}

ComPtr<ID3DBlob> compile(const char* entry, const char* target) {
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
                                     ID3DBlob* vs, const char* pixel_entry) {
    const auto ps = compile(pixel_entry, "ps_5_0");
    D3D12_GRAPHICS_PIPELINE_STATE_DESC desc{};
    desc.pRootSignature = root;
    desc.VS = {vs->GetBufferPointer(), vs->GetBufferSize()};
    desc.PS = {ps->GetBufferPointer(), ps->GetBufferSize()};
    desc.RasterizerState.FillMode = D3D12_FILL_MODE_SOLID;
    desc.RasterizerState.CullMode = D3D12_CULL_MODE_NONE;
    desc.RasterizerState.DepthClipEnable = TRUE;
    desc.DepthStencilState.DepthFunc = D3D12_COMPARISON_FUNC_ALWAYS;
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

ComPtr<ID3D12Resource> resource(ID3D12Device* device, D3D12_HEAP_TYPE type,
                                const D3D12_RESOURCE_DESC& desc, D3D12_RESOURCE_STATES state) {
    D3D12_HEAP_PROPERTIES heap{};
    heap.Type = type;
    heap.CreationNodeMask = 1;
    heap.VisibleNodeMask = 1;
    ComPtr<ID3D12Resource> result;
    check(device->CreateCommittedResource(&heap, D3D12_HEAP_FLAG_NONE, &desc, state,
                                           nullptr, IID_PPV_ARGS(&result)), "CreateCommittedResource");
    return result;
}

void transition(ID3D12GraphicsCommandList* list, ID3D12Resource* image,
                D3D12_RESOURCE_STATES before, D3D12_RESOURCE_STATES after) {
    D3D12_RESOURCE_BARRIER barrier{};
    barrier.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
    barrier.Transition = {image, 0, before, after};
    list->ResourceBarrier(1, &barrier);
}

void copy_image(ID3D12GraphicsCommandList* list, ID3D12Resource* image, ID3D12Resource* readback,
                const D3D12_PLACED_SUBRESOURCE_FOOTPRINT& footprint) {
    D3D12_TEXTURE_COPY_LOCATION src{};
    src.pResource = image;
    src.Type = D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;
    D3D12_TEXTURE_COPY_LOCATION dst{};
    dst.pResource = readback;
    dst.Type = D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;
    dst.PlacedFootprint = footprint;
    list->CopyTextureRegion(&dst, 0, 0, 0, &src, nullptr);
}

void verify_image(ID3D12Resource* buffer, const D3D12_PLACED_SUBRESOURCE_FOOTPRINT& footprint,
                  SIZE_T total, const char* label, const Pixel& left, const Pixel& right) {
    const D3D12_RANGE range{0, total};
    void* mapped = nullptr;
    check(buffer->Map(0, &range, &mapped), "Map readback");
    const auto* pixels = static_cast<const std::uint8_t*>(mapped) + footprint.Offset;
    UINT matches = 0;
    for (UINT y = 0; y < side; ++y) {
        const auto* row = pixels + y * footprint.Footprint.RowPitch;
        for (UINT x = 0; x < side; ++x) {
            const auto& expected = x < side / 2 ? left : right;
            if (std::memcmp(row + x * expected.size(), expected.data(), expected.size()) == 0) ++matches;
        }
    }
    const D3D12_RANGE no_writes{0, 0};
    buffer->Unmap(0, &no_writes);
    if (matches != side * side) {
        std::fprintf(stderr, "%s: %u/%u pixels match\n", label, matches, side * side);
        throw std::runtime_error("image does not match expected colors");
    }
    std::printf("%s: left=(%u,%u,%u,%u) right=(%u,%u,%u,%u); %u pixels match\n", label,
                static_cast<unsigned>(left[0]), static_cast<unsigned>(left[1]),
                static_cast<unsigned>(left[2]), static_cast<unsigned>(left[3]),
                static_cast<unsigned>(right[0]), static_cast<unsigned>(right[1]),
                static_cast<unsigned>(right[2]), static_cast<unsigned>(right[3]), matches);
}

void run() {
    ComPtr<IDXGIFactory4> factory;
    check(CreateDXGIFactory1(IID_PPV_ARGS(&factory)), "CreateDXGIFactory1");
    ComPtr<IDXGIAdapter> warp;
    check(factory->EnumWarpAdapter(IID_PPV_ARGS(&warp)), "EnumWarpAdapter");
    ComPtr<ID3D12Device> device;
    check(D3D12CreateDevice(warp.Get(), D3D_FEATURE_LEVEL_11_0, IID_PPV_ARGS(&device)),
          "D3D12CreateDevice (WARP)");

    D3D12_DESCRIPTOR_RANGE range{D3D12_DESCRIPTOR_RANGE_TYPE_SRV, 1, 0, 0, 0};
    D3D12_ROOT_PARAMETER table{};
    table.ParameterType = D3D12_ROOT_PARAMETER_TYPE_DESCRIPTOR_TABLE;
    table.DescriptorTable = {1, &range};
    table.ShaderVisibility = D3D12_SHADER_VISIBILITY_PIXEL;
    D3D12_ROOT_SIGNATURE_DESC root_desc{};
    root_desc.NumParameters = 1;
    root_desc.pParameters = &table;
    ComPtr<ID3DBlob> root_data;
    check(D3D12SerializeRootSignature(&root_desc, D3D_ROOT_SIGNATURE_VERSION_1, &root_data, nullptr),
          "D3D12SerializeRootSignature");
    ComPtr<ID3D12RootSignature> root;
    check(device->CreateRootSignature(0, root_data->GetBufferPointer(), root_data->GetBufferSize(),
                                      IID_PPV_ARGS(&root)), "CreateRootSignature");
    const auto vs = compile("fullscreen", "vs_5_0");
    const auto scene_pipeline = pipeline(device.Get(), root.Get(), vs.Get(), "scene_pass");
    const auto post_pipeline = pipeline(device.Get(), root.Get(), vs.Get(), "post_pass");

    D3D12_RESOURCE_DESC image_desc{};
    image_desc.Dimension = D3D12_RESOURCE_DIMENSION_TEXTURE2D;
    image_desc.Width = side;
    image_desc.Height = side;
    image_desc.DepthOrArraySize = 1;
    image_desc.MipLevels = 1;
    image_desc.Format = format;
    image_desc.SampleDesc.Count = 1;
    image_desc.Flags = D3D12_RESOURCE_FLAG_ALLOW_RENDER_TARGET;
    auto scene = resource(device.Get(), D3D12_HEAP_TYPE_DEFAULT, image_desc, D3D12_RESOURCE_STATE_RENDER_TARGET);
    auto output = resource(device.Get(), D3D12_HEAP_TYPE_DEFAULT, image_desc, D3D12_RESOURCE_STATE_RENDER_TARGET);

    D3D12_DESCRIPTOR_HEAP_DESC rtv_heap_desc{D3D12_DESCRIPTOR_HEAP_TYPE_RTV, 2};
    ComPtr<ID3D12DescriptorHeap> rtvs;
    check(device->CreateDescriptorHeap(&rtv_heap_desc, IID_PPV_ARGS(&rtvs)), "Create RTV heap");
    const auto scene_rtv = rtvs->GetCPUDescriptorHandleForHeapStart();
    auto output_rtv = scene_rtv;
    output_rtv.ptr += device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_RTV);
    device->CreateRenderTargetView(scene.Get(), nullptr, scene_rtv);
    device->CreateRenderTargetView(output.Get(), nullptr, output_rtv);

    D3D12_DESCRIPTOR_HEAP_DESC srv_heap_desc{D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV, 1,
                                             D3D12_DESCRIPTOR_HEAP_FLAG_SHADER_VISIBLE};
    ComPtr<ID3D12DescriptorHeap> srvs;
    check(device->CreateDescriptorHeap(&srv_heap_desc, IID_PPV_ARGS(&srvs)), "Create SRV heap");
    D3D12_SHADER_RESOURCE_VIEW_DESC srv{};
    srv.Format = format;
    srv.ViewDimension = D3D12_SRV_DIMENSION_TEXTURE2D;
    srv.Shader4ComponentMapping = D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;
    srv.Texture2D.MipLevels = 1;
    device->CreateShaderResourceView(scene.Get(), &srv, srvs->GetCPUDescriptorHandleForHeapStart());

    D3D12_PLACED_SUBRESOURCE_FOOTPRINT footprint{};
    UINT64 total = 0;
    device->GetCopyableFootprints(&image_desc, 0, 1, 0, &footprint, nullptr, nullptr, &total);
    D3D12_RESOURCE_DESC buffer_desc{};
    buffer_desc.Dimension = D3D12_RESOURCE_DIMENSION_BUFFER;
    buffer_desc.Width = total;
    buffer_desc.Height = 1;
    buffer_desc.DepthOrArraySize = 1;
    buffer_desc.MipLevels = 1;
    buffer_desc.SampleDesc.Count = 1;
    buffer_desc.Layout = D3D12_TEXTURE_LAYOUT_ROW_MAJOR;
    auto scene_readback = resource(device.Get(), D3D12_HEAP_TYPE_READBACK, buffer_desc, D3D12_RESOURCE_STATE_COPY_DEST);
    auto output_readback = resource(device.Get(), D3D12_HEAP_TYPE_READBACK, buffer_desc, D3D12_RESOURCE_STATE_COPY_DEST);

    D3D12_COMMAND_QUEUE_DESC queue_desc{};
    queue_desc.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
    ComPtr<ID3D12CommandQueue> queue;
    ComPtr<ID3D12CommandAllocator> allocator;
    ComPtr<ID3D12GraphicsCommandList> list;
    ComPtr<ID3D12Fence> fence;
    check(device->CreateCommandQueue(&queue_desc, IID_PPV_ARGS(&queue)), "CreateCommandQueue");
    check(device->CreateCommandAllocator(queue_desc.Type, IID_PPV_ARGS(&allocator)), "CreateCommandAllocator");
    check(device->CreateCommandList(0, queue_desc.Type, allocator.Get(), scene_pipeline.Get(),
                                    IID_PPV_ARGS(&list)), "CreateCommandList");
    check(device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&fence)), "CreateFence");

    const D3D12_VIEWPORT viewport{0, 0, static_cast<float>(side), static_cast<float>(side), 0, 1};
    const D3D12_RECT scissor{0, 0, side, side};
    constexpr float black[]{0, 0, 0, 1};
    list->SetGraphicsRootSignature(root.Get());
    list->RSSetViewports(1, &viewport);
    list->RSSetScissorRects(1, &scissor);
    list->IASetPrimitiveTopology(D3D_PRIMITIVE_TOPOLOGY_TRIANGLELIST);

    // Pass 1 writes the scene texture through its RTV.
    list->ClearRenderTargetView(scene_rtv, black, 0, nullptr);
    list->OMSetRenderTargets(1, &scene_rtv, FALSE, nullptr);
    list->DrawInstanced(3, 1, 0, 0);

    // Pass 2 reads the same texture through its SRV and writes a separate output.
    transition(list.Get(), scene.Get(), D3D12_RESOURCE_STATE_RENDER_TARGET,
               D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE);
    list->SetPipelineState(post_pipeline.Get());
    ID3D12DescriptorHeap* shader_heaps[]{srvs.Get()};
    list->SetDescriptorHeaps(1, shader_heaps);
    list->SetGraphicsRootDescriptorTable(0, srvs->GetGPUDescriptorHandleForHeapStart());
    list->ClearRenderTargetView(output_rtv, black, 0, nullptr);
    list->OMSetRenderTargets(1, &output_rtv, FALSE, nullptr);
    list->DrawInstanced(3, 1, 0, 0);

    transition(list.Get(), scene.Get(), D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE, D3D12_RESOURCE_STATE_COPY_SOURCE);
    transition(list.Get(), output.Get(), D3D12_RESOURCE_STATE_RENDER_TARGET, D3D12_RESOURCE_STATE_COPY_SOURCE);
    copy_image(list.Get(), scene.Get(), scene_readback.Get(), footprint);
    copy_image(list.Get(), output.Get(), output_readback.Get(), footprint);
    check(list->Close(), "Close command list");
    ID3D12CommandList* batch[]{list.Get()};
    queue->ExecuteCommandLists(1, batch);
    check(queue->Signal(fence.Get(), 1), "Signal fence");
    check(fence->SetEventOnCompletion(1, nullptr), "Wait for fence");
    check(device->GetDeviceRemovedReason(), "D3D12 device status");

    verify_image(scene_readback.Get(), footprint, static_cast<SIZE_T>(total), "pass 1", red, green);
    verify_image(output_readback.Get(), footprint, static_cast<SIZE_T>(total), "pass 2", blue, green);
}

int main() {
    try {
        run();
    } catch (const std::exception& error) {
        std::fprintf(stderr, "error: %s\n", error.what());
        return 1;
    }
    return 0;
}

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <d3d12.h>
#include <dxgi1_4.h>
#include <wrl/client.h>

#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <latch>
#include <stdexcept>
#include <thread>

using Microsoft::WRL::ComPtr;

void check(HRESULT result, const char* operation) {
    if (FAILED(result)) {
        char message[128]{};
        std::snprintf(message, sizeof(message), "%s failed (HRESULT 0x%08lX)",
                      operation, static_cast<unsigned long>(result));
        throw std::runtime_error(message);
    }
}

ComPtr<ID3D12Resource> buffer(ID3D12Device* device, UINT64 bytes, D3D12_HEAP_TYPE type,
                             D3D12_RESOURCE_STATES state) {
    D3D12_HEAP_PROPERTIES heap{};
    heap.Type = type;
    heap.CreationNodeMask = 1;
    heap.VisibleNodeMask = 1;

    D3D12_RESOURCE_DESC desc{};
    desc.Dimension = D3D12_RESOURCE_DIMENSION_BUFFER;
    desc.Width = bytes;
    desc.Height = 1;
    desc.DepthOrArraySize = 1;
    desc.MipLevels = 1;
    desc.SampleDesc.Count = 1;
    desc.Layout = D3D12_TEXTURE_LAYOUT_ROW_MAJOR;

    ComPtr<ID3D12Resource> result;
    check(device->CreateCommittedResource(&heap, D3D12_HEAP_FLAG_NONE, &desc, state,
                                           nullptr, IID_PPV_ARGS(&result)), "CreateCommittedResource");
    return result;
}

struct Recording {
    ComPtr<ID3D12CommandAllocator> allocator;
    ComPtr<ID3D12GraphicsCommandList> list;
    HRESULT closed = E_FAIL;
};

Recording make_recording(ID3D12Device* device) {
    Recording recording;
    check(device->CreateCommandAllocator(D3D12_COMMAND_LIST_TYPE_DIRECT,
                                         IID_PPV_ARGS(&recording.allocator)), "CreateCommandAllocator");
    check(device->CreateCommandList(0, D3D12_COMMAND_LIST_TYPE_DIRECT, recording.allocator.Get(),
                                    nullptr, IID_PPV_ARGS(&recording.list)), "CreateCommandList");
    return recording;
}

void run() {
    ComPtr<IDXGIFactory4> factory;
    check(CreateDXGIFactory1(IID_PPV_ARGS(&factory)), "CreateDXGIFactory1");
    ComPtr<IDXGIAdapter> warp;
    check(factory->EnumWarpAdapter(IID_PPV_ARGS(&warp)), "EnumWarpAdapter");
    ComPtr<ID3D12Device> device;
    check(D3D12CreateDevice(warp.Get(), D3D_FEATURE_LEVEL_11_0, IID_PPV_ARGS(&device)),
          "D3D12CreateDevice (WARP)");

    D3D12_COMMAND_QUEUE_DESC queue_desc{};
    queue_desc.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
    ComPtr<ID3D12CommandQueue> queue;
    ComPtr<ID3D12Fence> fence;
    check(device->CreateCommandQueue(&queue_desc, IID_PPV_ARGS(&queue)), "CreateCommandQueue");
    check(device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&fence)), "CreateFence");

    constexpr std::array<std::uint32_t, 4> input{0x11223344, 0x55667788, 0x99aabbcc, 0xddeeff00};
    constexpr std::size_t bytes = input.size() * sizeof(input[0]);
    auto upload = buffer(device.Get(), bytes, D3D12_HEAP_TYPE_UPLOAD, D3D12_RESOURCE_STATE_GENERIC_READ);
    auto scratch = buffer(device.Get(), bytes, D3D12_HEAP_TYPE_DEFAULT, D3D12_RESOURCE_STATE_COPY_DEST);
    auto readback = buffer(device.Get(), bytes, D3D12_HEAP_TYPE_READBACK, D3D12_RESOURCE_STATE_COPY_DEST);
    const D3D12_RANGE empty{0, 0};
    const D3D12_RANGE full{0, bytes};
    void* mapped = nullptr;
    check(upload->Map(0, &empty, &mapped), "Map upload");
    std::memcpy(mapped, input.data(), bytes);
    upload->Unmap(0, &full);

    auto a = make_recording(device.Get());
    auto b = make_recording(device.Get());
    std::latch start{1};
    std::latch b_finished{1};
    std::jthread record_b([&] {
        start.wait();
        D3D12_RESOURCE_BARRIER barrier{};
        barrier.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
        barrier.Transition = {scratch.Get(), D3D12_RESOURCE_BARRIER_ALL_SUBRESOURCES,
                              D3D12_RESOURCE_STATE_COPY_DEST, D3D12_RESOURCE_STATE_COPY_SOURCE};
        b.list->ResourceBarrier(1, &barrier);
        b.list->CopyBufferRegion(readback.Get(), 0, scratch.Get(), 0, bytes);
        b.closed = b.list->Close();
        b_finished.count_down();
    });

    std::jthread record_a;
    try {
        record_a = std::jthread([&] {
            start.wait();
            a.list->CopyBufferRegion(scratch.Get(), 0, upload.Get(), 0, bytes);
            // Deliberately close A after B to make the recording order observable.
            b_finished.wait();
            a.closed = a.list->Close();
        });
    } catch (...) {
        start.count_down();  // Release B before its jthread destructor joins.
        throw;
    }
    start.count_down();
    record_a.join();
    record_b.join();
    check(a.closed, "Close A");
    check(b.closed, "Close B");
    std::puts("CPU recording finished: B -> A");

    // Scratch is written by A; B transitions and reads it. Submit one ordered batch.
    ID3D12CommandList* batch[]{a.list.Get(), b.list.Get()};
    queue->ExecuteCommandLists(2, batch);
    std::puts("Submitted to one DIRECT queue: A -> B");
    check(queue->Signal(fence.Get(), 1), "Signal fence");
    check(fence->SetEventOnCompletion(1, nullptr), "Wait for fence");
    check(device->GetDeviceRemovedReason(), "D3D12 device status");

    check(readback->Map(0, &full, &mapped), "Map readback");
    const bool matches = std::memcmp(mapped, input.data(), bytes) == 0;
    readback->Unmap(0, &empty);
    if (!matches) throw std::runtime_error("readback differs from the upload data");
    std::printf("Fence 1 reached; all %zu readback bytes match\n", bytes);
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

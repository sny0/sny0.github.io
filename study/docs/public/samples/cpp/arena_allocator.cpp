// C++20 — アリーナ(bump)アロケータ(docs/07_memory_and_runtime/06)
#include <cstddef>
#include <cstdio>
#include <memory>
#include <new>
#include <vector>

// #region arena-class
class Arena {
public:
    explicit Arena(std::size_t bytes) : buffer_(bytes), offset_(0), highWater_(0) {}
    Arena(const Arena&) = delete;
    Arena& operator=(const Arena&) = delete;
    Arena(Arena&&) = delete;
    Arena& operator=(Arena&&) = delete;

    void* Allocate(std::size_t size, std::size_t align) {
        // ゼロサイズ、不正なalignment、容量超過は失敗とする。
        if (size == 0 || align == 0 || (align & (align - 1)) != 0 ||
            size > buffer_.size() - offset_) return nullptr;
        void* current = buffer_.data() + offset_;
        std::size_t space = buffer_.size() - offset_;
        // offsetではなく、実際のアドレスを基準に合わせる。
        if (std::align(align, size, current, space) == nullptr) return nullptr;
        const auto p = static_cast<std::byte*>(current) - buffer_.data();
        offset_ = p + size;
        if (offset_ > highWater_) highWater_ = offset_;
        return buffer_.data() + p;
    }
    void Reset() { offset_ = 0; }                // 一括「解放」(デストラクタは呼ばれない点に注意)
    std::size_t HighWater() const { return highWater_; }
private:
    std::vector<std::byte> buffer_;
    std::size_t offset_;
    std::size_t highWater_;                      // 必要容量の計測用
};
// #endregion arena-class

struct HitInfo { float x, y; int damage; };      // POD的な一時データ(デストラクタ不要)

int main() {
    Arena frameArena(64 * 1024);

    for (int frame = 0; frame < 3; ++frame) {    // 毎フレーム: 確保 → 使う → Reset
        int hits = 10 + frame * 5;
        void* storage = frameArena.Allocate(sizeof(HitInfo) * hits, alignof(HitInfo));
        if (storage == nullptr) {
            std::fputs("arena capacity exhausted\n", stderr);
            return 1;
        }
        // 非確保placement new[]で、この領域に配列を構築する。
        HitInfo* arr = ::new (storage) HitInfo[hits];
        for (int i = 0; i < hits; ++i) arr[i] = {1.f * i, 2.f * i, i * 10};
        std::printf("frame %d: %d hits, last damage=%d\n", frame, hits, arr[hits - 1].damage);
        frameArena.Reset();                      // フレーム末尾で一括巻き戻し
    }
    std::printf("high water mark=%zu bytes\n", frameArena.HighWater());
    return 0;
}

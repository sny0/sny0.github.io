// C++20 — アリーナ(bump)アロケータ(docs/07_memory_and_runtime/06)
#include <cstddef>
#include <cstdio>
#include <vector>

class Arena {
public:
    explicit Arena(std::size_t bytes) : buffer_(bytes), offset_(0), highWater_(0) {}

    void* Allocate(std::size_t size, std::size_t align) {
        std::size_t p = (offset_ + align - 1) & ~(align - 1);   // アラインメント調整
        if (p + size > buffer_.size()) return nullptr;          // 満杯ポリシー: 失敗を返す
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

struct HitInfo { float x, y; int damage; };      // POD的な一時データ(デストラクタ不要)

int main() {
    Arena frameArena(64 * 1024);

    for (int frame = 0; frame < 3; ++frame) {    // 毎フレーム: 確保 → 使う → Reset
        int hits = 10 + frame * 5;
        HitInfo* arr = static_cast<HitInfo*>(
            frameArena.Allocate(sizeof(HitInfo) * hits, alignof(HitInfo)));
        for (int i = 0; i < hits; ++i) arr[i] = {1.f * i, 2.f * i, i * 10};
        std::printf("frame %d: %d hits, last damage=%d\n", frame, hits, arr[hits - 1].damage);
        frameArena.Reset();                      // フレーム末尾で一括巻き戻し
    }
    std::printf("high water mark=%u bytes(容量決定の根拠になる)\n", frameArena.HighWater());
    return 0;
}

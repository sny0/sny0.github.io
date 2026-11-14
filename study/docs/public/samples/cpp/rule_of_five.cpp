// C++20 — 生リソースを持つ型のRule of Five(docs/05_cpp_language/05)
// 通常のクラスはRule of Zeroで何も書かない。これは「ラッパを書く側」の教材。
#include <cstddef>
#include <cstdio>
#include <utility>

class Buffer {
public:
    explicit Buffer(std::size_t n) : size_(n), data_(new int[n]{}) {
        std::printf("construct (%zu)\n", n);
    }
    ~Buffer() {
        std::printf("destruct (%zu)\n", size_);
        delete[] data_;
    }
    Buffer(const Buffer& o) : size_(o.size_), data_(new int[o.size_]) {   // コピー: 深い複製
        for (std::size_t i = 0; i < size_; ++i) data_[i] = o.data_[i];
        std::printf("copy-construct (%zu)\n", size_);
    }
    Buffer& operator=(const Buffer& o) {
        if (this != &o) { Buffer tmp(o); Swap(tmp); }   // copy-and-swap
        std::printf("copy-assign (%zu)\n", size_);
        return *this;
    }
    Buffer(Buffer&& o) noexcept : size_(o.size_), data_(o.data_) {        // ムーブ: 奪う
        o.size_ = 0; o.data_ = nullptr;
        std::printf("move-construct (%zu)\n", size_);
    }
    Buffer& operator=(Buffer&& o) noexcept {
        if (this != &o) { delete[] data_; size_ = o.size_; data_ = o.data_; o.size_ = 0; o.data_ = nullptr; }
        std::printf("move-assign (%zu)\n", size_);
        return *this;
    }
    std::size_t Size() const { return size_; }
private:
    void Swap(Buffer& o) noexcept { std::swap(size_, o.size_); std::swap(data_, o.data_); }
    std::size_t size_;
    int* data_;    // 生ポインタ: このクラスが唯一の所有者(Rule of Fiveの理由)
};

Buffer MakeBig() { Buffer b(1000); return b; }   // 戻りはムーブまたはコピー省略

int main() {
    Buffer a(10);
    Buffer b = a;              // copy
    Buffer c = std::move(a);   // move(aは空の抜け殻に)
    b = MakeBig();             // 戻り値から既存の b へムーブ代入。NRVO が省けるのは構築だけ
    std::printf("b.Size=%zu c.Size=%zu\n", b.Size(), c.Size());
    return 0;
}

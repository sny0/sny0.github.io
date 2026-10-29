// C++20 — RAIIによるファイルの確実なclose(docs/05_cpp_language/06)
#include <cstdio>

class File {
public:
    File(const char* path, const char* mode) : f_(std::fopen(path, mode)) {
        std::printf("open %s -> %s\n", path, f_ ? "ok" : "fail");
    }
    ~File() {
        if (f_) { std::fclose(f_); std::printf("closed by destructor\n"); }
    }
    File(const File&) = delete;              // 二重closeの防止
    File& operator=(const File&) = delete;
    File(File&& o) noexcept : f_(o.f_) { o.f_ = nullptr; }
    File& operator=(File&& o) noexcept {
        if (this != &o) { if (f_) std::fclose(f_); f_ = o.f_; o.f_ = nullptr; }
        return *this;
    }
    bool IsOpen() const { return f_ != nullptr; }
    FILE* Get() const { return f_; }
private:
    FILE* f_;
};

bool SaveGame(bool failMidway) {
    File f("raii_demo_save.tmp", "wb");
    if (!f.IsOpen()) return false;
    std::fputs("header\n", f.Get());
    if (failMidway) return false;      // early returnでも必ずcloseされる
    std::fputs("body\n", f.Get());
    return true;
}

int main() {
    std::printf("-- normal path --\n");
    SaveGame(false);
    std::printf("-- early return path --\n");
    SaveGame(true);
    std::remove("raii_demo_save.tmp");
    return 0;
}

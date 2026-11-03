// Resource-lifetime demonstration. No user file is created or removed.
#if defined(_MSC_VER)
#define _CRT_SECURE_NO_WARNINGS
#endif
#include <cstdio>
#include <utility>

class File {
public:
    explicit File(const char* device) : file_(std::fopen(device, "wb")) {}
    ~File() { Close(); }
    File(const File&) = delete;
    File& operator=(const File&) = delete;
    File(File&& other) noexcept : file_(std::exchange(other.file_, nullptr)) {}
    File& operator=(File&& other) noexcept {
        if (this != &other) {
            Close();
            file_ = std::exchange(other.file_, nullptr);
        }
        return *this;
    }
    bool IsOpen() const noexcept { return file_ != nullptr; }
    std::FILE* Get() const noexcept { return file_; }
    bool Close() noexcept {
        if (!file_) return true;
        std::FILE* owned = std::exchange(file_, nullptr);
        const bool ok = std::fclose(owned) == 0;
        ++closed_;
        if (!ok) ++close_errors_;
        return ok;
    }
    static int Closed() noexcept { return closed_; }
    static int CloseErrors() noexcept { return close_errors_; }
private:
    std::FILE* file_;
    static inline int closed_ = 0;
    static inline int close_errors_ = 0;
};

enum class Result { complete, stopped, failed };

Result WriteRecord(bool stopEarly) {
#if defined(_WIN32)
    File file("NUL");
#else
    File file("/dev/null");
#endif
    // The OS null device discards bytes. This does not save game data.
    if (!file.IsOpen()) return Result::failed;
    if (std::fputs("header\n", file.Get()) == EOF) return Result::failed;
    if (stopEarly) return Result::stopped; // Destructor closes on early return.
    if (std::fputs("body\n", file.Get()) == EOF) return Result::failed;
    // Check explicit close on the successful path; destructor cannot return an error.
    return file.Close() ? Result::complete : Result::failed;
}

int main() {
    const Result normal = WriteRecord(false);
    const bool normal_ok = normal == Result::complete && File::Closed() == 1;
    const Result early = WriteRecord(true);
    const bool early_ok = early == Result::stopped && File::Closed() == 2;
    const bool ok = normal_ok && early_ok && File::CloseErrors() == 0;
    std::printf("normal=%s early=%s closed=%d close_errors=%d\n",
        normal_ok ? "PASS" : "FAIL", early_ok ? "PASS" : "FAIL",
        File::Closed(), File::CloseErrors());
    return ok ? 0 : 1;
}

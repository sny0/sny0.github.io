// C++20 — Proxy(遅延ロード)(docs/03_design_patterns/proxy.md)
#include <cstdio>
#include <memory>
#include <string>

class ITexture {
public:
    virtual ~ITexture() = default;
    virtual void Bind() = 0;
    virtual int Width() const = 0;
};

class RealTexture : public ITexture {              // 本物(構築が重い想定)
public:
    explicit RealTexture(std::string path) : path_(std::move(path)) {
        std::printf("  [heavy load] %s\n", path_.c_str());
        width_ = 1024;
    }
    void Bind() override { std::printf("  bind %s\n", path_.c_str()); }
    int Width() const override { return width_; }
private:
    std::string path_;
    int width_ = 0;
};

class LazyTextureProxy : public ITexture {         // 代理: 初アクセスまでロードしない
public:
    explicit LazyTextureProxy(std::string path) : path_(std::move(path)) {}
    void Bind() override { Ensure(); real_->Bind(); }
    int Width() const override { Ensure(); return real_->Width(); }
private:
    void Ensure() const {
        if (!real_) real_ = std::make_unique<RealTexture>(path_);
    }
    std::string path_;
    mutable std::unique_ptr<RealTexture> real_;    // 論理的にはconstな遅延構築 → mutable
};

int main() {
    std::printf("create proxies (ロードは起きない)\n");
    LazyTextureProxy a("boss.png"), b("unused.png");
    std::printf("use a:\n");
    a.Bind();                                      // ここで初めて本物が作られる
    std::printf("width=%d\n", a.Width());          // 2回目はロードなし
    std::printf("(bは一度も使われないのでロードされない)\n");
    (void)b;
    return 0;
}

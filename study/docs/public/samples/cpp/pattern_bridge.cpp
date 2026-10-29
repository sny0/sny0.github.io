// C++20 — Bridge(docs/03_design_patterns/bridge.md)
#include <cstdio>
#include <string>

class IRenderer {                                  // 実装側の軸(どうやって描くか)
public:
    virtual ~IRenderer() = default;
    virtual void DrawRect(float x, float y, float w, float h) = 0;
    virtual void DrawText(const std::string& text, float x, float y) = 0;
};
class GpuRenderer : public IRenderer {
public:
    void DrawRect(float x, float y, float w, float h) override {
        std::printf("[GPU] rect(%.0f,%.0f,%.0f,%.0f)\n", x, y, w, h);
    }
    void DrawText(const std::string& t, float x, float y) override {
        std::printf("[GPU] text'%s'(%.0f,%.0f)\n", t.c_str(), x, y);
    }
};
class DebugTextRenderer : public IRenderer {
public:
    void DrawRect(float, float, float w, float h) override { std::printf("[TXT] rect %gx%g\n", w, h); }
    void DrawText(const std::string& t, float, float) override { std::printf("[TXT] %s\n", t.c_str()); }
};

class Widget {                                     // 抽象側の軸(何を描くか)。橋=参照
public:
    explicit Widget(IRenderer& r) : renderer_(r) {}
    virtual ~Widget() = default;
    virtual void Draw() = 0;
protected:
    IRenderer& renderer_;
};
class Button : public Widget {
public:
    using Widget::Widget;
    void Draw() override {
        renderer_.DrawRect(0, 0, 100, 30);
        renderer_.DrawText("OK", 40, 8);
    }
};
class Slider : public Widget {
public:
    using Widget::Widget;
    void Draw() override { renderer_.DrawRect(0, 0, 200, 8); }
};

int main() {
    GpuRenderer gpu;
    DebugTextRenderer txt;
    Button b1(gpu), b2(txt);                       // 組み合わせ=参照の差し替え(積が和になる)
    Slider s1(gpu);
    b1.Draw(); b2.Draw(); s1.Draw();
    return 0;
}

// C++20 — 演算子オーバーロード(数学ベクトル)(docs/05_cpp_language/08)
#include <cstdio>

struct Vec2 {
    float x = 0, y = 0;
    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator-(const Vec2& o) const { return {x - o.x, y - o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }
    // C++20では `= default` で自動生成できる(GCC 10+/MSVC。検証環境GCC 9.2では手書き)
    bool operator==(const Vec2& o) const { return x == o.x && y == o.y; }
};
Vec2 operator*(float s, const Vec2& v) { return v * s; }   // 2.0f * v 用(非メンバ)

float Dot(const Vec2& a, const Vec2& b) { return a.x * b.x + a.y * b.y; }  // 内積は関数名で
                                                    // (operator*はスカラー倍と衝突・曖昧なため)
int main() {
    Vec2 pos{1, 2};
    Vec2 vel{3, 0};
    float dt = 0.5f;
    pos += vel * dt;
    std::printf("pos=(%.1f, %.1f)\n", pos.x, pos.y);
    Vec2 a = 2.0f * vel;
    std::printf("2*vel=(%.1f, %.1f) dot=%.1f eq=%d\n", a.x, a.y, Dot(pos, vel), (int)(pos == pos));
    return 0;
}

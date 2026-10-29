// C++20 — 配列・vector・stringの基本と再確保の観察(docs/05_cpp_language/03)
#include <array>
#include <cstdio>
#include <string>
#include <string_view>
#include <vector>

void PrintName(std::string_view n) { std::printf("name=%.*s\n", (int)n.size(), n.data()); }

int main() {
    std::array<int, 5> fixed{10, 20, 30, 40, 50};
    std::printf("array size=%u front=%d\n", fixed.size(), fixed[0]);

    std::vector<int> v;
    const int* prevData = nullptr;
    for (int i = 0; i < 20; ++i) {
        v.push_back(i);
        if (v.data() != prevData) {   // 再確保で先頭アドレスが変わった瞬間を観察
            std::printf("size=%u capacity=%u data=%p (再確保)\n",
                        v.size(), v.capacity(), static_cast<const void*>(v.data()));
            prevData = v.data();
        }
    }

    std::string name = "Slime";
    name += "_King";                   // 同一オブジェクト内で伸長
    PrintName(name);                   // string_viewでコピーなし受け渡し
    std::printf("string size=%u\n", name.size());
    return 0;
}

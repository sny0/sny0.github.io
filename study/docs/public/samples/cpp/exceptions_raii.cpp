// C++20 — 例外のスタック巻き戻しとRAII(docs/05_cpp_language/12)
#include <cstdio>
#include <stdexcept>
#include <string>

class Tracer {                          // 破棄がログに出るRAIIオブジェクト
public:
    explicit Tracer(const char* name) : name_(name) { std::printf("  enter %s\n", name); }
    ~Tracer() { std::printf("  ~exit %s\n", name_.c_str()); }
private:
    std::string name_;
};

void ParseConfig(bool fail) {
    Tracer t("ParseConfig");
    if (fail) throw std::runtime_error("config broken");
    std::printf("  parsed ok\n");
}

void Boot(bool fail) {
    Tracer t("Boot");
    ParseConfig(fail);
    std::printf("  boot done\n");
}

int main() {
    std::printf("-- success --\n");
    Boot(false);

    std::printf("-- failure(巻き戻しで各Tracerが破棄される) --\n");
    try {
        Boot(true);
    } catch (const std::exception& e) {   // const参照で受ける(コピー・スライシング防止)
        std::printf("caught: %s\n", e.what());
    }
    return 0;
}

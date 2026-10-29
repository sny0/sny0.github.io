// C++20 — Abstract Factory(docs/03_design_patterns/abstract_factory.md)
#include <cstdio>
#include <memory>

class IButton { public: virtual ~IButton() = default; virtual void Draw() const = 0; };
class IDialog { public: virtual ~IDialog() = default; virtual void Open() const = 0; };

class PcButton : public IButton { public: void Draw() const override { std::printf("[PC button]\n"); } };
class PcDialog : public IDialog { public: void Open() const override { std::printf("[PC dialog: ESC to close]\n"); } };
class PadButton : public IButton { public: void Draw() const override { std::printf("[Pad button: focus frame]\n"); } };
class PadDialog : public IDialog { public: void Open() const override { std::printf("[Pad dialog: B to close]\n"); } };

class IUiFactory {                              // 一族の生成をまとめて宣言
public:
    virtual ~IUiFactory() = default;
    virtual std::unique_ptr<IButton> CreateButton() const = 0;
    virtual std::unique_ptr<IDialog> CreateDialog() const = 0;
};
class PcUiFactory : public IUiFactory {
public:
    std::unique_ptr<IButton> CreateButton() const override { return std::make_unique<PcButton>(); }
    std::unique_ptr<IDialog> CreateDialog() const override { return std::make_unique<PcDialog>(); }
};
class PadUiFactory : public IUiFactory {
public:
    std::unique_ptr<IButton> CreateButton() const override { return std::make_unique<PadButton>(); }
    std::unique_ptr<IDialog> CreateDialog() const override { return std::make_unique<PadDialog>(); }
};

void BuildSettingsScreen(const IUiFactory& f) {  // クライアントは具象を知らない=混在が起きない
    f.CreateButton()->Draw();
    f.CreateDialog()->Open();
}

int main() {
    std::printf("-- PC --\n");
    BuildSettingsScreen(PcUiFactory{});
    std::printf("-- Pad --\n");
    BuildSettingsScreen(PadUiFactory{});
    return 0;
}

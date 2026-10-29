// C++20 — Mediator(装備画面の部品調整)(docs/03_design_patterns/mediator.md)
#include <cstdio>
#include <string>

struct Item { std::string name; int attack = 0; };

class StatusPanel {
public:
    void ShowWith(const Item& item) { std::printf("  [Status] attack+%d\n", item.attack); }
};
class PreviewPane {
public:
    void ShowModel(const Item& item) { std::printf("  [Preview] model of %s\n", item.name.c_str()); }
};

class EquipScreenMediator {                        // 調整ロジックはここに集約
public:
    EquipScreenMediator(StatusPanel& s, PreviewPane& p) : status_(s), preview_(p) {}
    void OnItemSelected(const Item& item) {
        std::printf("selected: %s\n", item.name.c_str());
        status_.ShowWith(item);
        preview_.ShowModel(item);
        // 部品が増えてもここに足すだけ。部品同士は互いを知らない
    }
private:
    StatusPanel& status_;
    PreviewPane& preview_;
};

class EquipListView {                              // 部品はMediatorだけを知る
public:
    explicit EquipListView(EquipScreenMediator& m) : mediator_(m) {}
    void UserClicks(const Item& item) { mediator_.OnItemSelected(item); }
private:
    EquipScreenMediator& mediator_;
};

int main() {
    StatusPanel status;
    PreviewPane preview;
    EquipScreenMediator screen(status, preview);
    EquipListView list(screen);

    list.UserClicks({"Iron Sword", 12});
    list.UserClicks({"Flame Blade", 34});
    return 0;
}

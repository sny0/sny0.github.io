// 公開ヘッダー: 宣言の配布物(docs/06_cpp_internals/02)
#pragma once
#include <string>

class Enemy {
public:
    explicit Enemy(std::string name);
    void TakeDamage(int amount);      // 宣言のみ(定義はenemy.cpp)
    int Hp() const { return hp_; }    // クラス内定義=暗黙inline(配ってよい)
    const std::string& Name() const { return name_; }
private:
    std::string name_;
    int hp_ = 100;
};

// ヘッダーに定義を書く関数はinline必須(外すと多重定義のリンクエラー — 実験3)
inline std::string Description(const Enemy& e) {
    return e.Name() + "(hp=" + std::to_string(e.Hp()) + ")";
}

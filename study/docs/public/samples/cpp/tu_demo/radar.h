// 前方宣言で足りるヘッダーの例(docs/06_cpp_internals/02)
#pragma once

class Enemy;                          // 前方宣言: ポインタ/参照にはこれで十分(includeを避け
                                      // enemy.h変更時の再コンパイル連鎖を切る)
class Radar {
public:
    void Track(Enemy* target);        // 非所有: 敵の寿命は呼び出し側が管理
    void Report() const;
private:
    Enemy* target_ = nullptr;
};

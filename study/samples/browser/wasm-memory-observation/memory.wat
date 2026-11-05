(module
  (memory (export "memory") 1 2)

  (func (export "add_at") (param $ptr i32) (param $delta i32) (result i32)
    (local $updated i32)

    local.get $ptr
    i32.load
    local.get $delta
    i32.add
    local.set $updated

    local.get $ptr
    local.get $updated
    i32.store

    local.get $updated))

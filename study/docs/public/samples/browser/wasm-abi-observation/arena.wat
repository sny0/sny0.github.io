(module
  (memory (export "memory") 1 2)
  (global $heap_base i32 (i32.const 1024))
  (global $frontier (mut i32) (i32.const 1024))

  (func (export "cursor") (result i32)
    (global.get $frontier))

  (func (export "reset")
    (global.set $frontier (global.get $heap_base)))

  (func (export "alloc") (param $size i32) (result i32)
    (local $start i32)
    (local $limit i32)

    (if (i32.le_s (local.get $size) (i32.const 0))
      (then (return (i32.const 0))))

    ;; The frontier never exceeds two 64 KiB pages. Rounding up fits in i32.
    (local.set $start
      (i32.and (i32.add (global.get $frontier) (i32.const 7)) (i32.const -8)))
    (local.set $limit (i32.mul (memory.size) (i32.const 65536)))

    ;; Check the available bytes before adding the requested size.
    (if (i32.gt_u (local.get $size) (i32.sub (local.get $limit) (local.get $start)))
      (then (return (i32.const 0))))

    (global.set $frontier (i32.add (local.get $start) (local.get $size)))
    (local.get $start))

  (func $check_span (param $ptr i32) (param $count i32) (param $width_shift i32)
    ;; The span check covers the whole arena, including alignment padding.
    (if (i32.or
          (i32.lt_u (local.get $ptr) (global.get $heap_base))
          (i32.gt_u (local.get $ptr) (global.get $frontier)))
      (then unreachable))

    ;; Compare in elements to avoid count * width overflow.
    ;; An unsigned comparison also rejects negative i32 counts.
    (if (i32.gt_u (local.get $count)
          (i32.shr_u
            (i32.sub (global.get $frontier) (local.get $ptr))
            (local.get $width_shift)))
      (then unreachable)))

  (func (export "sum_i32") (param $ptr i32) (param $count i32) (result i32)
    (local $sum i32)
    (call $check_span (local.get $ptr) (local.get $count) (i32.const 2))
    (block $done
      (loop $each
        (br_if $done (i32.eqz (local.get $count)))
        (local.set $sum (i32.add (local.get $sum) (i32.load (local.get $ptr))))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 4)))
        (local.set $count (i32.sub (local.get $count) (i32.const 1)))
        (br $each)))
    (local.get $sum))

  (func (export "sum_u8") (param $ptr i32) (param $length i32) (result i32)
    (local $sum i32)
    (call $check_span (local.get $ptr) (local.get $length) (i32.const 0))
    (block $done
      (loop $each
        (br_if $done (i32.eqz (local.get $length)))
        (local.set $sum (i32.add (local.get $sum) (i32.load8_u (local.get $ptr))))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
        (local.set $length (i32.sub (local.get $length) (i32.const 1)))
        (br $each)))
    (local.get $sum)))

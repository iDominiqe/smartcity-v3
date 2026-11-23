;; WebAssembly (WAT) 3D-to-2D Spatial Projection & Solar Energy Kernel
;; Linear Memory Layout:
;;   Bytes  0..63 : 4x4 View-Projection Matrix (16 x f32, column-major)
;;   Bytes 64..75 : Input World Coordinates (x, y, z : 3 x f32)
;;   Bytes 80..87 : Output Viewport Coordinates (sx, sy : 2 x f32)

(module
  (memory (export "memory") 1)

  ;; Projects 3D world point at offset 64 using matrix at offset 0 -> writes (sx, sy) at offset 80, returns ndcZ
  (func (export "project_point") (param $width f32) (param $height f32) (result f32)
    (local $x f32)
    (local $y f32)
    (local $z f32)
    (local $invW f32)
    (local $ndcX f32)
    (local $ndcY f32)
    (local $ndcZ f32)

    (local.set $x (f32.load (i32.const 64)))
    (local.set $y (f32.load (i32.const 68)))
    (local.set $z (f32.load (i32.const 72)))

    ;; cw = m[3]*x + m[7]*y + m[11]*z + m[15]
    (local.set $invW
      (f32.div
        (f32.const 1.0)
        (f32.add
          (f32.add
            (f32.mul (f32.load (i32.const 12)) (local.get $x))
            (f32.mul (f32.load (i32.const 28)) (local.get $y))
          )
          (f32.add
            (f32.mul (f32.load (i32.const 44)) (local.get $z))
            (f32.load (i32.const 60))
          )
        )
      )
    )

    ;; ndcX = (m[0]*x + m[4]*y + m[8]*z + m[12]) * invW
    (local.set $ndcX
      (f32.mul
        (f32.add
          (f32.add
            (f32.mul (f32.load (i32.const 0)) (local.get $x))
            (f32.mul (f32.load (i32.const 16)) (local.get $y))
          )
          (f32.add
            (f32.mul (f32.load (i32.const 32)) (local.get $z))
            (f32.load (i32.const 48))
          )
        )
        (local.get $invW)
      )
    )

    ;; ndcY = (m[1]*x + m[5]*y + m[9]*z + m[13]) * invW
    (local.set $ndcY
      (f32.mul
        (f32.add
          (f32.add
            (f32.mul (f32.load (i32.const 4)) (local.get $x))
            (f32.mul (f32.load (i32.const 20)) (local.get $y))
          )
          (f32.add
            (f32.mul (f32.load (i32.const 36)) (local.get $z))
            (f32.load (i32.const 52))
          )
        )
        (local.get $invW)
      )
    )

    ;; ndcZ = (m[2]*x + m[6]*y + m[10]*z + m[14]) * invW
    (local.set $ndcZ
      (f32.mul
        (f32.add
          (f32.add
            (f32.mul (f32.load (i32.const 8)) (local.get $x))
            (f32.mul (f32.load (i32.const 24)) (local.get $y))
          )
          (f32.add
            (f32.mul (f32.load (i32.const 40)) (local.get $z))
            (f32.load (i32.const 56))
          )
        )
        (local.get $invW)
      )
    )

    ;; sx = (ndcX * 0.5 + 0.5) * width
    (f32.store (i32.const 80)
      (f32.mul
        (f32.add (f32.mul (local.get $ndcX) (f32.const 0.5)) (f32.const 0.5))
        (local.get $width)
      )
    )

    ;; sy = (0.5 - ndcY * 0.5) * height
    (f32.store (i32.const 84)
      (f32.mul
        (f32.sub (f32.const 0.5) (f32.mul (local.get $ndcY) (f32.const 0.5)))
        (local.get $height)
      )
    )

    (local.get $ndcZ)
  )

  ;; Clean kWh generation + Smart LED savings
  (func (export "calc_solar_yield") (param $area f32) (param $poles f32) (param $sun f32) (result f32)
    (f32.add
      (f32.mul (f32.mul (local.get $area) (f32.const 0.21)) (local.get $sun))
      (f32.mul (local.get $poles) (f32.const 310.0))
    )
  )
)

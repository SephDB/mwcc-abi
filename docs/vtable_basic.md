# VTables and non-virtual inheritance

This is where MWCC's ABI start differentiating itself from Itanium. We'll look at the different cases of how vtables get created without virtual inheritance first. 

## Basic example

Let's look at an example vtable without inheritance involved yet:

```cpp
struct A {
    virtual void test();
    int a;
};
```
```dot
digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        A [label=<<table cellspacing="0">
            <tr><td rowspan="2">A</td><td>0x0</td><td port="A_vtable">__vtable</td></tr>
            <tr><td>0x4</td><td>a</td></tr>
        </table>>];
        A_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for A</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="3">A_vtable</td><td port="A_RTTI">A::__RTTI</td></tr>
            <tr><td>0(concrete offset)</td></tr>
            <tr><td port="A_test">A::test</td></tr>
        </table>>];
        }
        A:A_vtable -> A_vt:A_RTTI:w;
    }

    subgraph cluster_itanium {
        label="Itanium";
        {rank=same
        A2 [label=<<table cellspacing="0">
            <tr><td rowspan="2">A</td><td>0x0</td><td port="A_vtable">__vtable</td></tr>
            <tr><td>0x4</td><td port="A_test">a</td></tr>
        </table>>];

        A_vt2 [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for A</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="3">A_vtable</td><td>0(concrete offset)</td></tr>
            <tr><td port="A_RTTI">A::__RTTI</td></tr>
            <tr><td port="A_start">A::test</td></tr>
        </table>>];
        }
        A2:A_vtable -> A_vt2:A_start:w;
    }
}
```

As you can see, there's a few ordering differences: MWCC has objects' vtable pointers point to the start of the structure, whereas Itanium has them point to the start of the virtual function table within the vtable.

The concrete offset is 0 in simple cases like this, but it'll be relevant in multiple inheritance cases where it gives the offset from the subobject a vtable is part of to the concrete type's position.

In Itanium the vtable pointer is always at the start of an (sub)object, but MWCC has a different algorithm: it puts the vtable pointer in declaration order of the first declared virtual method:

```cpp
struct A {
    int a;
    virtual void test();
};
```
```dot

digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        A [label=<<table cellspacing="0">
            <tr><td rowspan="2">A</td><td>0x0</td><td>a</td></tr>
            <tr><td>0x4</td><td port="A_vtable">__vtable</td></tr>
        </table>>];
        A_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for A</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="3">A_vtable</td><td port="A_RTTI">A::__RTTI</td></tr>
            <tr><td>0(concrete offset)</td></tr>
            <tr><td port="A_test">A::test</td></tr>
        </table>>];
        }
        A:A_vtable -> A_vt:A_RTTI:w;
    }
}
```

Note how the concrete offset in the vtable remains unchanged, since it is based on the offset from a pointer to the subobject, not the offset of the vtable itself.

## Single Inheritance

```cpp
struct A {
    virtual void test();
    int a;
};

struct B : A {
    void test(); //override
    virtual void new_func();
    int b;
};
```
```dot

digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        B [label=<<table cellspacing="0">
            <tr><td rowspan="5">B</td><td rowspan="2">A</td><td>0x0</td><td port="B_vtable">__vtable</td></tr>
            <tr><td>0x4</td><td>a</td></tr>
            <tr><td colspan="2">0x8</td><td>b</td></tr>
        </table>>];
        B_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for B</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="4">A_vtable</td><td port="B_RTTI">B::__RTTI</td></tr>
            <tr><td>0(concrete offset)</td></tr>
            <tr><td port="A_test">B::test</td></tr>
            <tr><td>B::new_func</td></tr>
        </table>>];
        }
        B:B_vtable -> B_vt:B_RTTI:w;
    }
}
```

The vtable pointer of A gets repointed to a version that replaces the pointers to RTTI and test to B's version, and adds B's new_func at the end.

Outside of where the vtable pointer ends up pointing inside the vtable structure, no new difference with Itanium here.

## Multiple inheritance

Taking an example from [Moyang Wang's VTable Notes](https://gist.github.com/moyang/1b7726c6d2df459ef73a717a56a0abfe), let's jump in the deep end with the dreaded non-virtual diamond inheritance pattern:

```cpp
struct A {
    virtual void v();
    int a;
};

struct B : A {
    virtual void w();
    int b;
};

struct C : A {
    virtual void x();
    int c;
};

struct D : B, C {
    virtual void y();
    int d;
};
```
```dot
digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        D [label=<<table cellspacing="0">
            <tr><td rowspan="7">D</td><td rowspan="3">B</td><td rowspan="2">A</td><td>0x0</td><td port="D_vt1">__vtable</td></tr>
            <tr><td>0x4</td><td>B::A::a</td></tr>
            <tr><td colspan="2">0x8</td><td>B::b</td></tr>
            <tr><td rowspan="3">C</td><td rowspan="2">A</td><td>0xc</td><td port="D_vt2">__vtable</td></tr>
            <tr><td>0x10</td><td>C::A::a</td></tr>
            <tr><td colspan="2">0x14</td><td>C::c</td></tr>
            <tr><td colspan="3">0x18</td><td>d</td></tr>
        </table>>];
        D_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for D</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="4">B_vtable</td><td port="D_RTTI1">D::__RTTI</td></tr>
            <tr><td>0(concrete offset)</td></tr>
            <tr><td>A::v</td></tr>
            <tr><td>B::w</td></tr>
            <tr><td rowspan="5">C_vtable</td><td port="D_RTTI2">D::__RTTI</td></tr>
            <tr><td>-0xc(concrete offset)</td></tr>
            <tr><td>A::v</td></tr>
            <tr><td>C::x</td></tr>
            <tr><td>D::y</td></tr>
        </table>>];
        }
        D:D_vt1 -> D_vt:D_RTTI1:w
        D:D_vt2 -> D_vt:D_RTTI2:w
    }

    subgraph cluster_itanium {
        label="Itanium";
        {rank=same
        D2 [label=<<table cellspacing="0">
            <tr><td rowspan="7">D</td><td rowspan="3">B</td><td rowspan="2">A</td><td>0x0</td><td port="D_vt1">__vtable</td></tr>
            <tr><td>0x4</td><td>B::A::a</td></tr>
            <tr><td colspan="2">0x8</td><td>B::b</td></tr>
            <tr><td rowspan="3">C</td><td rowspan="2">A</td><td>0xc</td><td port="D_vt2">__vtable</td></tr>
            <tr><td>0x10</td><td>C::A::a</td></tr>
            <tr><td colspan="2">0x14</td><td>C::c</td></tr>
            <tr><td colspan="3">0x18</td><td>d</td></tr>
        </table>>];
        D2_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for D</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="5">B_vtable</td><td>0(concrete offset)</td></tr>
            <tr><td>D::__RTTI</td></tr>
            <tr><td port="D_RTTI1">A::v</td></tr>
            <tr><td>B::w</td></tr>
            <tr><td>D::y</td></tr>
            <tr><td rowspan="4">C_vtable</td><td>-0xc(concrete offset)</td></tr>
            <tr><td>D::__RTTI</td></tr>
            <tr><td port="D_RTTI2">A::v</td></tr>
            <tr><td>C::x</td></tr>
        </table>>];
        }
        D2:D_vt1 -> D2_vt:D_RTTI1:w
        D2:D_vt2 -> D2_vt:D_RTTI2:w
    }
}
```

The object layouts are identical, but MWCC adds D's new virtual function to the last vtable instead of the first like Itanium does. Itanium has the concept of a `primary base class`, which is the base class that sits at offset 0 in the object layout of a dynamic class(a class that requires a vtable) and shares its primary vtable pointer. Itanium will re-order the list of bases of a dynamic class to make sure the primary base class exists if possible. MWCC, however, will not:

```cpp
struct A {
    virtual void v();
    int a;
};

struct B {
    int b;
}; //No vtable

struct C : B,A {
    virtual void w();
    int c;
};
```
```dot

digraph G {
    rankdir=TB;
    node [shape=none];
    
    subgraph cluster_mwcc {
        label="MWCC";
        {rank=same;
        C [label=<<table cellspacing="0">
            <tr><td rowspan="5">C</td><td>B</td><td>0x0</td><td>b</td></tr>
            <tr><td rowspan="2">A</td><td>0x4</td><td port="A_vt">__vtable</td></tr>
            <tr><td>0x8</td><td>a</td></tr>
            <tr><td colspan="2">0xc</td><td port="C_vt">__vtable</td></tr>
            <tr><td colspan="2">0x10</td><td>c</td></tr>
        </table>>];
        C_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for C</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="2">C_vtable</td><td port="C_vt">C::__RTTI</td></tr>
            <tr><td>0(concrete offset)</td></tr>
            <tr><td rowspan="4">A_vtable</td><td port="A_vt">C::__RTTI</td></tr>
            <tr><td>-0x4(concrete offset)</td></tr>
            <tr><td>A::v</td></tr>
            <tr><td>C::w</td></tr>
        </table>>];
        }
        C:A_vt -> C_vt:A_vt:w;
        C:C_vt:e -> C_vt:C_vt:w;
    }

    subgraph cluster_itanium {
        label="Itanium";
        {rank=same
        C2 [label=<<table cellspacing="0">
            <tr><td rowspan="4">C</td><td rowspan="2">A</td><td>0x0</td><td port="A_vt">__vtable</td></tr>
            <tr><td>0x4</td><td>a</td></tr>
            <tr><td>B</td><td>0x8</td><td>b</td></tr>
            <tr><td colspan="2">0xc</td><td>c</td></tr>
        </table>>];
        C2_vt [label=<<table cellspacing="0">
            <tr><td colspan="2">Vtable for C</td></tr><tr><td colspan="2"></td></tr>
            <tr><td rowspan="4">A_vtable</td><td>C::__RTTI</td></tr>
            <tr><td>0(concrete offset)</td></tr>
            <tr><td port="A_vt">A::v</td></tr>
            <tr><td>C::w</td></tr>
        </table>>];
        }
        C2:A_vt -> C2_vt:A_vt:w;
    }
}
```
B is not a dynamic base class, but A is. In Itanium, this makes A the primary base class, and it gets shifted to the front of the direct base class order, enabling the use of A's vtable pointer as C's. MWCC keeps B as the first base, necessitating the introduction of another (empty) vtable to have a primary vtable that has offset 0. This is necessary for dynamic_cast to work correctly, since that looks at the primary vtable to know how much to adjust the pointer by to get to the concrete object.

Note that MWCC still appends C's virtual function `w` to A's vtable.

